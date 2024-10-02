import Queue from 'bull';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromises } from 'fs';
import mime from 'mime-types';
import dbClient from '../utils/db';
import { getIdAndKey, isValidUser } from '../utils/users';

class FilesController {
  static async postUpload(request, response) {
    const fileQ = new Queue('fileQ');
    const dir = process.env.FOLDER_PATH || '/tmp/files_manager';

    const { userId } = await getIdAndKey(request);
    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    if (!isValidUser(userId) || !user) return response.status(401).send({ error: 'Unauthorized' });

    const fileName = request.body.name;
    if (!fileName) return response.status(400).send({ error: 'Missing name' });

    const fileType = request.body.type;
    if (!fileType || !['folder', 'file', 'image'].includes(fileType)) return response.status(400).send({ error: 'Missing type' });

    const fileData = request.body.data;
    if (!fileData && fileType !== 'folder') return response.status(400).send({ error: 'Missing data' });

    const publicFile = request.body.isPublic || false;
    let parentId = request.body.parentId || 0;
    parentId = parentId === '0' ? 0 : parentId;
    if (parentId !== 0) {
      const parentFile = await dbClient.files.findOne({ _id: ObjectId(parentId) });
      if (!parentFile) return response.status(400).send({ error: 'Parent not found' });
      if (parentFile.type !== 'folder') return response.status(400).send({ error: 'Parent is not a folder' });
    }

    const fileInsertData = {
      userId: user._id,
      name: fileName,
      type: fileType,
      isPublic: publicFile,
      parentId,
    };

    if (fileType === 'folder') {
      await dbClient.files.insertOne(fileInsertData);
      return response.status(201).send(fileInsertData);
    }

    const fileUid = uuidv4();
    const decData = Buffer.from(fileData, 'base64');
    const filePath = `${dir}/${fileUid}`;

    try {
      await fsPromises.mkdir(dir, { recursive: true });
      await fsPromises.writeFile(filePath, decData);
    } catch (error) {
      return response.status(400).send({ error: error.message });
    }

    fileInsertData.localPath = filePath;
    const result = await dbClient.files.insertOne(fileInsertData);
    
    fileQ.add({ userId: fileInsertData.userId, fileId: result.insertedId });

    return response.status(201).send({ ...fileInsertData, id: result.insertedId });
  }
}
