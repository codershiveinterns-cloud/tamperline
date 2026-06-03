const { buildPayProCheckoutUrl } = require('../paypro-checkout');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(error);
        }
        return;
      }

      resolve(Object.fromEntries(new URLSearchParams(body)));
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  try {
    const body = await readBody(req);
    const redirectUrl = buildPayProCheckoutUrl({
      amount: body.amount,
      billing: body.billing,
      currency: body.currency || 'USD',
      orderId: body.order_id,
      plan: body.plan
    });

    res.statusCode = 303;
    res.setHeader('Location', redirectUrl);
    res.end();
  } catch (error) {
    console.error('[create-payment]', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(`Payment is not configured: ${error.message}`);
  }
};
