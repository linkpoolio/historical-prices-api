import type { NextApiRequest, NextApiResponse } from "next";
import { getRoundsByTimestamp } from "../../controllers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { contractAddress, startTimestamp, endTimestamp, chain } = req.query;
  if (!contractAddress || !startTimestamp || !endTimestamp || !chain) {
    return res.status(400).json({ error: "All fields are required." });
  }
  try {
    const result = await getRoundsByTimestamp(
      contractAddress as string,
      startTimestamp as string,
      endTimestamp as string,
      chain as string
    );
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
