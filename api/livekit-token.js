const { AccessToken } = require('livekit-server-sdk');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { roomName, identity, name } = req.body || {};
  if (!roomName || !identity) {
    res.status(400).json({ error: 'roomName and identity are required' });
    return;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) {
    res.status(500).json({ error: 'LiveKit is not configured on the server' });
    return;
  }

  const at = new AccessToken(apiKey, apiSecret, { identity, name });
  at.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true });
  const token = await at.toJwt();

  res.status(200).json({ token, url });
};
