import express from 'express';
import { getAssetsData } from './apiUtils.cjs';

const app = express();
const port = process.env.PORT || 1337;

app.get('/api/cg/tickers', async (req, res) => {
  const assetsData = await getAssetsData();
  res.json(assetsData);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${ port }`);
});