const path = require('path');
const express = require('express');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const admin = require('firebase-admin');
const { buildPayProCheckoutUrl } = require('../paypro-checkout');

// Initialize Firebase Admin SDK
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  serviceAccount = require('./firebase-key.json');
}

const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`;
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: firebaseDatabaseUrl
});

const db = admin.database();
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const staticRoot = path.join(__dirname, '..');
app.use(express.static(staticRoot));

const PORT = process.env.PORT || 3000;

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
  try {
    const redirectUrl = buildPayProCheckoutUrl({
      amount: req.body.amount,
      billing: req.body.billing,
      currency: req.body.currency || 'USD',
      orderId: req.body.order_id || `order-${Date.now()}`,
      plan: req.body.plan
    });

    res.redirect(303, redirectUrl);
  } catch (error) {
    console.error('[create-payment]', error);
    res.status(500).send(`Payment is not configured: ${error.message}`);
  }
});

app.get('/success', (req, res) => res.send('Payment successful.'));
app.get('/cancel', (req, res) => res.send('Payment cancelled.'));

app.get('/health', (req, res) => res.json({ status: 'ok', firebase: 'connected' }));

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
