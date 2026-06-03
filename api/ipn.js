module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  console.log('[PayPro IPN]', req.body || {});
  res.statusCode = 200;
  res.end('OK');
};
