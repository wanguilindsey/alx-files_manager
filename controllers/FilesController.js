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

static async getShow(request, response) {
  const { userId } = await getIdAndKey(request);
  const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
  if (!isValidUser(userId) || !user) return response.status(401).send({ error: 'Unauthorized' });

  const fileId = request.params.id || '';
  const file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
  if (!file) return response.status(404).send({ error: 'Not found' });

  return response.status(200).send({
    id: file._id,
    userId: file.userId,
    name: file.name,
    type: file.type,
    isPublic: file.isPublic,
    parentId: file.parentId,
  });
}

static async getIndex(request, response) {
  const { userId } = await getIdAndKey(request);
  const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
  if (!isValidUser(userId) || !user) return response.status(401).send({ error: 'Unauthorized' });

  let parentId = request.query.parentId || 0;
  if (parentId !== '0') {
    if (!isValidUser(parentId)) return response.status(401).send({ error: 'Unauthorized' });

    parentId = ObjectId(parentId);
    const folder = await dbClient.files.findOne({ _id: ObjectId(parentId) });
    if (!folder || folder.type !== 'folder') return response.status(200).send([]);
  }

  const page = parseInt(request.query.page, 10) || 0;
  const agg = { $and: [{ parentId }] };
  const aggData = parentId === 0
    ? [{ $skip: page * 20 }, { $limit: 20 }]
    : [{ $match: agg }, { $skip: page * 20 }, { $limit: 20 }];

  const pageFiles = await dbClient.files.aggregate(aggData);
  const files = [];

  await pageFiles.forEach((file) => {
    const fileObj = {
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    };
    files.push(fileObj);
  });

  return response.status(200).send(files);
}

static async putPublish(request, response) {
  const { userId } = await getIdAndKey(request);
  const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
  if (!isValidUser(userId) || !user) return response.status(401).send({ error: 'Unauthorized' });

  const fileId = request.params.id || '';
  let file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
  if (!file) return response.status(404).send({ error: 'Not found' });

  await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
  file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });

  return response.status(200).send({
    id: file._id,
    userId: file.userId,
    name: file.name,
    type: file.type,
    isPublic: file.isPublic,
    parentId: file.parentId,
  });
}

static async putUnpublish(request, response) {
  const { userId } = await getIdAndKey(request);
  const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
  if (!isValidUser(userId) || !user) return response.status(401).send({ error: 'Unauthorized' });

  const fileId = request.params.id || '';
  let file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
  if (!file) return response.status(404).send({ error: 'Not found' });

  await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
  file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });

  return response.status(200).send({
    id: file._id,
    userId: file.userId,
    name: file.name,
    type: file.type,
    isPublic: file.isPublic,
    parentId: file.parentId,
  });
}
