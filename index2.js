# Google Ads API OAuth - Do You Need It?

## Short Answer: YES, OAuth is REQUIRED

Google Ads API requires OAuth 2.0 authentication. You cannot use API keys or service accounts alone. However, **you only need to do OAuth setup ONCE** to get a refresh token, then you can use that token indefinitely in your Node.js app.

## Why OAuth is Required

Google Ads API uses OAuth 2.0 to:
1. Verify your identity
2. Authorize access to your Google Ads account
3. Ensure secure API access

## Two-Step Process

### Step 1: One-Time OAuth Setup (Get Refresh Token)
You do this ONCE manually to get a refresh token.

### Step 2: Automated API Calls (Use Refresh Token)
Your Node.js app uses the refresh token automatically - no user interaction needed.

---

## Complete OAuth Setup Guide

### STEP 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click "Create Project"
3. Name it (e.g., "Shopify-Ads-Integration")
4. Click "Create"

### STEP 2: Enable Google Ads API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Ads API"
3. Click on it and click **"Enable"**

### STEP 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. If prompted, configure OAuth consent screen:
   - User Type: **External** (or Internal if you have Google Workspace)
   - App name: "Shopify Ads Integration"
   - User support email: Your email
   - Developer contact: Your email
   - Click **"Save and Continue"**
   - Scopes: Skip for now, click **"Save and Continue"**
   - Test users: Add your email
   - Click **"Save and Continue"**

4. Back to Create OAuth Client ID:
   - Application type: **Desktop app** (or Web application)
   - Name: "Shopify Integration"
   - Click **"Create"**

5. **Download the credentials JSON** or copy:
   - Client ID (looks like: `xxxxx.apps.googleusercontent.com`)
   - Client Secret (looks like: `GOCSPX-xxxxx`)

### STEP 4: Get Developer Token

1. Sign in to your Google Ads account
2. Click **Tools** icon → **Setup** → **API Center**
3. Click **"Apply for access"** or view your developer token
4. For testing, you can use **"Basic" access** (approval is instant)
5. Copy your **Developer Token**

### STEP 5: Generate Refresh Token (ONE TIME)

Create a script to get your refresh token. You only run this ONCE.

**File: `scripts/generateRefreshToken.js`**

```javascript
const readline = require('readline');
const { google } = require('googleapis');
require('dotenv').config();

const OAuth2 = google.auth.OAuth2;

// Use your credentials from Step 3
const oauth2Client = new OAuth2(
  process.env.GOOGLE_ADS_CLIENT_ID,      // From Step 3
  process.env.GOOGLE_ADS_CLIENT_SECRET,  // From Step 3
  'urn:ietf:wg:oauth:2.0:oob'           // Special redirect URI for desktop apps
);

// Google Ads API scope
const scopes = ['https://www.googleapis.com/auth/adwords'];

// Generate the URL for authorization
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',  // Important: This gives you a refresh token
  scope: scopes,
  prompt: 'consent'        // Force consent screen to get refresh token
});

console.log('\n==============================================');
console.log('STEP 1: Authorize this app');
console.log('==============================================');
console.log('\nVisit this URL in your browser:\n');
console.log(authUrl);
console.log('\n==============================================\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('After authorizing, enter the code from the page: ', (code) => {
  rl.close();
  
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error retrieving access token:', err);
      return;
    }
    
    console.log('\n==============================================');
    console.log('SUCCESS! Save these to your .env file:');
    console.log('==============================================\n');
    console.log('GOOGLE_ADS_REFRESH_TOKEN=' + token.refresh_token);
    console.log('\n==============================================');
    console.log('You can now use this refresh token in your app!');
    console.log('==============================================\n');
  });
});
```

**Install dependencies:**
```bash
npm install googleapis readline dotenv
```

**Create `.env` file with your credentials:**
```env
GOOGLE_ADS_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
GOOGLE_ADS_CUSTOMER_ID=123-456-7890
```

**Run the script:**
```bash
node scripts/generateRefreshToken.js
```

**Follow the prompts:**
1. Script will print a URL
2. Open the URL in your browser
3. Sign in with your Google Ads account
4. Click "Allow"
5. Copy the authorization code
6. Paste it into the terminal
7. Script will print your **REFRESH_TOKEN**

**Add the refresh token to `.env`:**
```env
GOOGLE_ADS_REFRESH_TOKEN=1//your-refresh-token-here
```

### STEP 6: Get Your Customer ID

1. Sign in to Google Ads
2. Look at the top right corner - you'll see your Customer ID (format: `123-456-7890`)
3. Add it to `.env` (remove the dashes):

```env
GOOGLE_ADS_CUSTOMER_ID=1234567890
```

---

## Final `.env` File

After completing all steps, your `.env` should look like:

```env
# Google Ads API Credentials
GOOGLE_ADS_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-abcdefghijklmnop
GOOGLE_ADS_DEVELOPER_TOKEN=ABcdEFghIJklMNop
GOOGLE_ADS_REFRESH_TOKEN=1//0abcdefghijklmnopqrstuvwxyz
GOOGLE_ADS_CUSTOMER_ID=1234567890

# Shopify Credentials
SHOPIFY_SHOP_NAME=your-shop.myshopify.com
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
SHOPIFY_ACCESS_TOKEN=shpat_your-access-token

PORT=3000
```

---

## Using the google-ads-api Package (Simplified)

The `google-ads-api` npm package handles OAuth automatically using your refresh token.

**Install:**
```bash
npm install google-ads-api
```

**Usage in your app:**
```javascript
const { GoogleAdsApi } = require('google-ads-api');

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

// Now you can make API calls
async function getAdSpend() {
  const results = await customer.query(`
    SELECT campaign.name, metrics.cost_micros
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
  `);
  
  console.log(results);
}
```

The library automatically:
- Uses your refresh token to get access tokens
- Refreshes access tokens when they expire
- Handles all OAuth complexity for you

---

## Alternative: Service Account (NOT SUPPORTED for Google Ads)

⚠️ **Important:** Google Ads API does NOT support service accounts. You MUST use OAuth 2.0 with a refresh token.

---

## Common Questions

### Q: Do I need to do OAuth every time my app runs?
**A:** No! The refresh token lasts indefinitely. Your app uses it automatically.

### Q: What if my refresh token expires?
**A:** Refresh tokens for Google Ads don't expire unless:
- You revoke access manually
- Your app is unused for 6 months (Google may revoke it)
- Solution: Just run the generateRefreshToken script again

### Q: Can multiple apps use the same refresh token?
**A:** Yes, you can use the same refresh token across multiple servers/apps.

### Q: Do my users need to authenticate?
**A:** No! This is YOUR authentication to YOUR Google Ads account. End users never see this.

### Q: Can I use this in production?
**A:** Yes! Once you have the refresh token, it works in development and production.

---

## Quick Start Checklist

- [ ] Create Google Cloud Project
- [ ] Enable Google Ads API
- [ ] Create OAuth credentials (Client ID & Secret)
- [ ] Get Developer Token from Google Ads
- [ ] Run generateRefreshToken.js script
- [ ] Copy refresh token to .env
- [ ] Get Customer ID from Google Ads
- [ ] Test API connection

---

## Test Your Setup

Create `test-connection.js`:

```javascript
const { GoogleAdsApi } = require('google-ads-api');
require('dotenv').config();

async function testConnection() {
  try {
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    const campaigns = await customer.query(`
      SELECT campaign.id, campaign.name
      FROM campaign
      LIMIT 1
    `);

    console.log('✅ Connection successful!');
    console.log('Found campaigns:', campaigns);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
```

Run:
```bash
node test-connection.js
```

If successful, you're ready to use the Google Ads API!

---

## Summary

**YES, you need OAuth, but it's a ONE-TIME setup:**

1. ✅ Create OAuth credentials (5 minutes)
2. ✅ Run script to get refresh token (2 minutes)  
3. ✅ Add credentials to .env file (1 minute)
4. ✅ Your app uses them automatically forever

**NO ongoing OAuth needed** - the google-ads-api package handles everything after initial setup!