// Function to extract userId from the session (request.session)
export const getIdAndKey = (request) => {
  const { userId } = request.session;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Session ID acts as the key in this context
  const key = request.sessionID;

  return { userId, key };
};

// Function to validate if userId is valid
export const isValidUser = (userId) => {
  return userId ? true : false; // Simple check to ensure userId is present
};
