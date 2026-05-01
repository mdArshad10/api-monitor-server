export const onBoardClientSchema = {
  name: {
    required: true,
    minLength: 10,
  },
  email: {
    required: true,
  },
  description: {
    required: true,
    minLength: 10,
  },
  website: {
    required: true,
  },
};
