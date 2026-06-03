const express = require('express');
const crypto = require('crypto');
require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.database();
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PAYPRO_URL = process.env.PAYPRO_URL || 'https://secure.payproglobal.com/process/';
const MERCHANT_ID = process.env.MERCHANT_ID || 'YOUR_MERCHANT_ID';
const SECRET = process.env.PAYPRO_SECRET || 'YOUR_SECRET';

// Firebase Data Sync & Restore Endpoints
app.post('/sync-data', async (req, res) => {
  try {
    const { userId, data } = req.body;
    if (!userId || !data) {
      return res.status(400).json({ error: 'Missing userId or data' });
    }
    
    await db.ref(`users/${userId}/data`).set(data);
    res.json({ success: true, message: 'Data synced to Firebase' });
  } catch (error) {
    console.error('[SYNC] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/restore-data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    const snapshot = await db.ref(`users/${userId}/data`).once('value');
    const data = snapshot.val();
    
    if (!data) {
      return res.json({ success: true, data: null, message: 'No data found' });
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('[RESTORE] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/backup-all', async (req, res) => {
  try {
    const { userId, bookings, inventory, batches } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    const backup = {
      bookings: bookings || [],
      inventory: inventory || [],
      batches: batches || [],
      timestamp: new Date().toISOString()
    };
    
    await db.ref(`users/${userId}/backup`).set(backup);
    res.json({ success: true, message: 'Full backup completed', backup });
  } catch (error) {
    console.error('[BACKUP] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/get-backup/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    const snapshot = await db.ref(`users/${userId}/backup`).once('value');
    const backup = snapshot.val();
    
    if (!backup) {
      return res.json({ success: true, backup: null, message: 'No backup found' });
    }
    
    res.json({ success: true, backup });
  } catch (error) {
    console.error('[GET_BACKUP] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/ipn', (req, res) => {
  console.log('[IPN] Received:', req.body);
  // Implement verification according to PayPro Global docs and then update your order state.
  res.sendStatus(200);
});

app.post('/create-payment', (req, res) => {
  const { amount = '0.00', order_id = `order-${Date.now()}`, currency = 'USD' } = req.body;
  const merchant_id = MERCHANT_ID;

  // NOTE: Adjust the signature algorithm to match PayPro Global requirements.
  const signatureBase = `${merchant_id}|${order_id}|${amount}|${currency}`;
  const signature = crypto.createHmac('sha256', SECRET).update(signatureBase).digest('hex');

  const returnUrl = process.env.RETURN_URL || 'http://localhost:8080/success.html';
  const cancelUrl = process.env.CANCEL_URL || 'http://localhost:8080/cancel.html';
  const notifyUrl = process.env.NOTIFY_URL || `http://localhost:${PORT}/ipn`;

  const html = `<!doctype html><html><body>
    <form id="payfrm" action="${PAYPRO_URL}" method="post">
      <input type="hidden" name="merchant_id" value="${merchant_id}" />
      <input type="hidden" name="amount" value="${amount}" />
      <input type="hidden" name="currency" value="${currency}" />
      <input type="hidden" name="order_id" value="${order_id}" />
      <input type="hidden" name="return_url" value="${returnUrl}" />
      <input type="hidden" name="cancel_url" value="${cancelUrl}" />
      <input type="hidden" name="notify_url" value="${notifyUrl}" />
      <input type="hidden" name="signature" value="${signature}" />
    </form>
    <script>document.getElementById('payfrm').submit();</script>
  </body></html>`;

  res.send(html);
});

app.get('/success', (req, res) => res.send('Payment successful.'));
app.get('/cancel', (req, res) => res.send('Payment cancelled.'));

app.get('/health', (req, res) => res.json({ status: 'ok', firebase: 'connected' }));

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
