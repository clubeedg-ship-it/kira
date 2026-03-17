import { createApp } from './app';

const PORT = parseInt(process.env.PORT || '4000');

const app = createApp();

app.listen(PORT, () => {
  console.log(`Oopuo Platform running on port ${PORT}`);
});
