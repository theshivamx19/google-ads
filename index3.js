# Complete Google Ads Integration - Start to Finish
## From OAuth Setup to Getting Your Ad Data

This is a **complete, step-by-step guide** that takes you from nothing to a working Google Ads integration.

---

## 📋 What We'll Build

A Node.js application that:
1. Authenticates with Google Ads API (OAuth)
2. Fetches your ad campaign data
3. Gets product-specific performance metrics
4. Calculates ROI and ROAS

---

## 🚀 PART 1: Initial Setup (5 minutes)

### Step 1.1: Create Project Directory

```bash
mkdir google-ads-integration
cd google-ads-integration
npm init -y
```

### Step 1.2: Install Dependencies

```bash
npm install google-ads-api googleapis dotenv express
npm install --save-dev nodemon
```

### Step 1.3: Update package.json

Edit `package.json` and add scripts:

```json
{
  "name": "google-ads-integration",
  "version": "1.0.0",
  "description": "Google Ads integration for tracking ad performance",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "setup": "node scripts/1-generateRefreshToken.js",
    "test": "node scripts/3-testConnection.js"
  },
  "dependencies": {
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "google-ads-api": "^15.0.0",
    "googleapis": "^118.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### Step 1.4: Create Folder Structure

```bash
mkdir scripts
mkdir services
mkdir routes
mkdir config
```

Your structure should look like:
```
google-ads-integration/
├── scripts/
├── services/
├── routes/
├── config/
├── package.json
└── .env (we'll create this next)
```

---

## 🔐 PART 2: Google Cloud & OAuth Setup (10 minutes)

### Step 2.1: Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click **"Select a Project"** → **"New Project"**
3. Project name: `google-ads-integration`
4. Click **"Create"**
5. Wait for project creation (30 seconds)

### Step 2.2: Enable Google Ads API

1. Make sure your new project is selected (top left)
2. Click the **☰ menu** → **"APIs & Services"** → **"Library"**
3. Search for: `Google Ads API`
4. Click on **"Google Ads API"**
5. Click **"Enable"**
6. Wait for it to enable (~10 seconds)

### Step 2.3: Configure OAuth Consent Screen

1. Click **☰ menu** → **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** → Click **"Create"**
3. Fill in the form:
   - App name: `Google Ads Integration`
   - User support email: Your email
   - Developer contact: Your email
4. Click **"Save and Continue"**
5. **Scopes page**: Click **"Save and Continue"** (skip)
6. **Test users page**: Click **"+ Add Users"**
   - Add your Google email (the one with Google Ads access)
   - Click **"Add"**
7. Click **"Save and Continue"**
8. Click **"Back to Dashboard"**

### Step 2.4: Create OAuth Credentials

1. Click **☰ menu** → **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Desktop app"**
4. Name: `Google Ads Desktop Client`
5. Click **"Create"**
6. A dialog appears with your credentials:
   - **Copy the Client ID** (looks like: `123456789.apps.googleusercontent.com`)
   - **Copy the Client Secret** (looks like: `GOCSPX-abc123xyz`)
7. Click **"OK"**

**IMPORTANT: Keep these safe! You'll need them in the next step.**

### Step 2.5: Get Google Ads Developer Token

1. Go to https://ads.google.com
2. Sign in to your Google Ads account
3. Click **Tools icon** (🔧) in top right
4. Under **"Setup"**, click **"API Center"**
5. You'll see your **Developer token** (or need to apply for one)
   - If you don't have one: Click **"Apply for access"**
   - For testing: Choose **"Basic access"** (instant approval)
   - For production: Choose **"Standard access"** (requires review)
6. **Copy your Developer Token** (looks like: `AbCd1234EfGh5678`)

### Step 2.6: Get Your Customer ID

1. Still in Google Ads, look at the **top right corner**
2. You'll see a number like **`123-456-7890`**
3. This is your Customer ID
4. Copy it (we'll remove the dashes later)

### Step 2.7: Create .env File

Create `.env` file in your project root:

```env
# Google Ads OAuth Credentials (from Step 2.4)
GOOGLE_ADS_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-YOUR_CLIENT_SECRET

# Google Ads API (from Step 2.5)
GOOGLE_ADS_DEVELOPER_TOKEN=YOUR_DEVELOPER_TOKEN

# Google Ads Account (from Step 2.6 - remove dashes)
GOOGLE_ADS_CUSTOMER_ID=1234567890

# We'll get this in the next step
GOOGLE_ADS_REFRESH_TOKEN=

# Server
PORT=3000
```

**Replace all the placeholder values with your actual credentials from the steps above!**

---

## 🎫 PART 3: Generate Refresh Token (ONE TIME - 2 minutes)

### Step 3.1: Create Token Generation Script

Create file: `scripts/1-generateRefreshToken.js`

```javascript
const readline = require('readline');
const { google } = require('googleapis');
require('dotenv').config();

const OAuth2 = google.auth.OAuth2;

console.log('\n╔════════════════════════════════════════════╗');
console.log('║   Google Ads Refresh Token Generator      ║');
console.log('╚════════════════════════════════════════════╝\n');

// Validate environment variables
if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET) {
  console.error('❌ ERROR: Missing credentials in .env file');
  console.error('Please set GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET');
  process.exit(1);
}

const oauth2Client = new OAuth2(
  process.env.GOOGLE_ADS_CLIENT_ID,
  process.env.GOOGLE_ADS_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const scopes = ['https://www.googleapis.com/auth/adwords'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

console.log('📋 INSTRUCTIONS:');
console.log('1. Open this URL in your browser:');
console.log('2. Sign in with your Google Ads account');
console.log('3. Click "Allow"');
console.log('4. Copy the authorization code\n');
console.log('═══════════════════════════════════════════════════════════');
console.log(authUrl);
console.log('═══════════════════════════════════════════════════════════\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('📝 Enter the authorization code here: ', (code) => {
  rl.close();
  
  console.log('\n⏳ Generating refresh token...\n');
  
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('❌ Error:', err.message);
      console.error('\nPlease try again and make sure you copied the entire code.');
      return;
    }
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ SUCCESS!                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('Your refresh token:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(token.refresh_token);
    console.log('─────────────────────────────────────────────────────────────\n');
    console.log('📝 NEXT STEPS:');
    console.log('1. Copy the refresh token above');
    console.log('2. Open your .env file');
    console.log('3. Set: GOOGLE_ADS_REFRESH_TOKEN=<paste token here>');
    console.log('4. Save the .env file');
    console.log('5. Run: npm test (to verify connection)\n');
  });
});
```

### Step 3.2: Run the Script

```bash
npm run setup
```

### Step 3.3: Follow the Instructions

1. The script will print a URL
2. **Copy the entire URL** and open it in your browser
3. Sign in with your Google Ads account
4. You'll see a permission screen - click **"Allow"**
5. You'll see a code (or it might say "success" with a code)
6. **Copy the entire code**
7. Go back to your terminal
8. **Paste the code** and press Enter

### Step 3.4: Save the Refresh Token

The script will print your refresh token. Copy it!

Open `.env` and update:

```env
GOOGLE_ADS_REFRESH_TOKEN=1//0abcdefgh-YOUR-ACTUAL-TOKEN-HERE
```

**DONE! You'll never need to do this OAuth dance again!** 🎉

---

## ✅ PART 4: Test Your Connection (1 minute)

### Step 4.1: Create Test Script

Create file: `scripts/3-testConnection.js`

```javascript
const { GoogleAdsApi } = require('google-ads-api');
require('dotenv').config();

console.log('\n╔════════════════════════════════════════════╗');
console.log('║    Testing Google Ads API Connection      ║');
console.log('╚════════════════════════════════════════════╝\n');

async function testConnection() {
  try {
    // Validate credentials
    const required = [
      'GOOGLE_ADS_CLIENT_ID',
      'GOOGLE_ADS_CLIENT_SECRET',
      'GOOGLE_ADS_DEVELOPER_TOKEN',
      'GOOGLE_ADS_REFRESH_TOKEN',
      'GOOGLE_ADS_CUSTOMER_ID'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing environment variables:');
      missing.forEach(key => console.error(`   - ${key}`));
      console.error('\nPlease check your .env file\n');
      process.exit(1);
    }

    console.log('✓ All credentials found');
    console.log('⏳ Connecting to Google Ads API...\n');

    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    // Try to fetch customer info
    const customerInfo = await customer.query(`
      SELECT 
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone
      FROM customer
      LIMIT 1
    `);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ CONNECTION SUCCESSFUL!               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    for (const row of customerInfo) {
      console.log('Account Details:');
      console.log('─────────────────────────────────────────────────────────────');
      console.log(`Customer ID: ${row.customer.id}`);
      console.log(`Account Name: ${row.customer.descriptive_name}`);
      console.log(`Currency: ${row.customer.currency_code}`);
      console.log(`Time Zone: ${row.customer.time_zone}`);
      console.log('─────────────────────────────────────────────────────────────\n');
    }

    // Try to fetch campaigns
    console.log('⏳ Fetching your campaigns...\n');
    
    const campaigns = await customer.query(`
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status
      FROM campaign
      ORDER BY campaign.name
      LIMIT 5
    `);

    console.log('Your Campaigns:');
    console.log('─────────────────────────────────────────────────────────────');
    
    if (campaigns.length === 0) {
      console.log('No campaigns found (this is OK if you just started)');
    } else {
      campaigns.forEach(row => {
        console.log(`• ${row.campaign.name} (Status: ${row.campaign.status})`);
      });
    }
    console.log('─────────────────────────────────────────────────────────────\n');
    
    console.log('🎉 Everything is working! You can now fetch ad data.\n');

  } catch (error) {
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║                    ❌ CONNECTION FAILED                    ║');
    console.error('╚════════════════════════════════════════════════════════════╝\n');
    console.error('Error:', error.message);
    
    if (error.message.includes('UNAUTHENTICATED')) {
      console.error('\n💡 TIP: Your refresh token might be invalid.');
      console.error('   Run: npm run setup (to generate a new one)\n');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.error('\n💡 TIP: Check your developer token and customer ID.\n');
    } else {
      console.error('\n💡 TIP: Double-check all values in your .env file\n');
    }
    
    process.exit(1);
  }
}

testConnection();
```

### Step 4.2: Run the Test

```bash
npm test
```

**Expected output:**
```
✅ CONNECTION SUCCESSFUL!

Account Details:
─────────────────────────────────────────────────────────────
Customer ID: 1234567890
Account Name: My Business
Currency: USD
Time Zone: America/New_York
─────────────────────────────────────────────────────────────

Your Campaigns:
─────────────────────────────────────────────────────────────
• Summer Sale Campaign (Status: ENABLED)
• Brand Awareness (Status: ENABLED)
─────────────────────────────────────────────────────────────

🎉 Everything is working! You can now fetch ad data.
```

If you see this, **you're ready to go!** 🚀

---

## 📊 PART 5: Build Services to Get Ad Data

### Step 5.1: Create Google Ads Service

Create file: `services/GoogleAdsService.js`

```javascript
const { GoogleAdsApi } = require('google-ads-api');

class GoogleAdsService {
  constructor() {
    this.client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    this.customer = this.client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });
  }

  /**
   * Get all campaigns with their performance metrics
   */
  async getCampaigns(startDate, endDate) {
    try {
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value,
          metrics.average_cpc,
          metrics.ctr
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        ORDER BY metrics.cost_micros DESC
      `;

      const results = await this.customer.query(query);
      
      const campaigns = [];
      for (const row of results) {
        campaigns.push({
          id: row.campaign.id,
          name: row.campaign.name,
          status: row.campaign.status,
          type: row.campaign.advertising_channel_type,
          cost: row.metrics.cost_micros / 1_000_000,
          clicks: row.metrics.clicks,
          impressions: row.metrics.impressions,
          conversions: row.metrics.conversions,
          revenue: row.metrics.conversions_value,
          avgCpc: row.metrics.average_cpc / 1_000_000,
          ctr: row.metrics.ctr,
        });
      }

      return campaigns;
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  /**
   * Get campaign performance summary
   */
  async getCampaignSummary(startDate, endDate) {
    try {
      const campaigns = await this.getCampaigns(startDate, endDate);
      
      const summary = campaigns.reduce((acc, campaign) => ({
        totalCost: acc.totalCost + campaign.cost,
        totalClicks: acc.totalClicks + campaign.clicks,
        totalImpressions: acc.totalImpressions + campaign.impressions,
        totalConversions: acc.totalConversions + campaign.conversions,
        totalRevenue: acc.totalRevenue + campaign.revenue,
      }), {
        totalCost: 0,
        totalClicks: 0,
        totalImpressions: 0,
        totalConversions: 0,
        totalRevenue: 0,
      });

      // Calculate metrics
      summary.roas = summary.totalCost > 0 
        ? (summary.totalRevenue / summary.totalCost).toFixed(2)
        : 0;
      
      summary.roi = summary.totalCost > 0
        ? (((summary.totalRevenue - summary.totalCost) / summary.totalCost) * 100).toFixed(2)
        : 0;
      
      summary.avgCpc = summary.totalClicks > 0
        ? (summary.totalCost / summary.totalClicks).toFixed(2)
        : 0;
      
      summary.conversionRate = summary.totalClicks > 0
        ? ((summary.totalConversions / summary.totalClicks) * 100).toFixed(2)
        : 0;
      
      summary.avgCtr = summary.totalImpressions > 0
        ? ((summary.totalClicks / summary.totalImpressions) * 100).toFixed(2)
        : 0;

      summary.activeCampaigns = campaigns.filter(c => c.status === 'ENABLED').length;
      summary.totalCampaigns = campaigns.length;

      return summary;
    } catch (error) {
      console.error('Error calculating summary:', error);
      throw error;
    }
  }

  /**
   * Get ad group performance
   */
  async getAdGroups(campaignId, startDate, endDate) {
    try {
      const query = `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          campaign.name,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value
        FROM ad_group
        WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${startDate}' AND '${endDate}'
        ORDER BY metrics.cost_micros DESC
      `;

      const results = await this.customer.query(query);
      
      const adGroups = [];
      for (const row of results) {
        adGroups.push({
          id: row.ad_group.id,
          name: row.ad_group.name,
          status: row.ad_group.status,
          campaignName: row.campaign.name,
          cost: row.metrics.cost_micros / 1_000_000,
          clicks: row.metrics.clicks,
          impressions: row.metrics.impressions,
          conversions: row.metrics.conversions,
          revenue: row.metrics.conversions_value,
        });
      }

      return adGroups;
    } catch (error) {
      console.error('Error fetching ad groups:', error);
      throw error;
    }
  }

  /**
   * Get keyword performance
   */
  async getKeywords(startDate, endDate, limit = 20) {
    try {
      const query = `
        SELECT
          ad_group.name,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          campaign.name,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value,
          metrics.average_cpc
        FROM keyword_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND ad_group_criterion.status = 'ENABLED'
        ORDER BY metrics.cost_micros DESC
        LIMIT ${limit}
      `;

      const results = await this.customer.query(query);
      
      const keywords = [];
      for (const row of results) {
        keywords.push({
          keyword: row.ad_group_criterion.keyword.text,
          matchType: row.ad_group_criterion.keyword.match_type,
          adGroup: row.ad_group.name,
          campaign: row.campaign.name,
          cost: row.metrics.cost_micros / 1_000_000,
          clicks: row.metrics.clicks,
          impressions: row.metrics.impressions,
          conversions: row.metrics.conversions,
          revenue: row.metrics.conversions_value,
          avgCpc: row.metrics.average_cpc / 1_000_000,
        });
      }

      return keywords;
    } catch (error) {
      console.error('Error fetching keywords:', error);
      throw error;
    }
  }

  /**
   * Get shopping product performance (for ecommerce)
   */
  async getProductPerformance(startDate, endDate, limit = 50) {
    try {
      const query = `
        SELECT
          segments.product_item_id,
          segments.product_title,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value
        FROM shopping_performance_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        ORDER BY metrics.cost_micros DESC
        LIMIT ${limit}
      `;

      const results = await this.customer.query(query);
      
      const products = [];
      for (const row of results) {
        const cost = row.metrics.cost_micros / 1_000_000;
        const revenue = row.metrics.conversions_value;
        
        products.push({
          productId: row.segments.product_item_id,
          productTitle: row.segments.product_title,
          cost: cost,
          clicks: row.metrics.clicks,
          impressions: row.metrics.impressions,
          conversions: row.metrics.conversions,
          revenue: revenue,
          roas: cost > 0 ? (revenue / cost).toFixed(2) : 0,
          roi: cost > 0 ? (((revenue - cost) / cost) * 100).toFixed(2) : 0,
        });
      }

      return products;
    } catch (error) {
      console.error('Error fetching product performance:', error);
      throw error;
    }
  }

  /**
   * Get daily performance trend
   */
  async getDailyPerformance(startDate, endDate) {
    try {
      const query = `
        SELECT
          segments.date,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        ORDER BY segments.date ASC
      `;

      const results = await this.customer.query(query);
      
      const dailyData = {};
      
      for (const row of results) {
        const date = row.segments.date;
        
        if (!dailyData[date]) {
          dailyData[date] = {
            date: date,
            cost: 0,
            clicks: 0,
            impressions: 0,
            conversions: 0,
            revenue: 0,
          };
        }
        
        dailyData[date].cost += row.metrics.cost_micros / 1_000_000;
        dailyData[date].clicks += row.metrics.clicks;
        dailyData[date].impressions += row.metrics.impressions;
        dailyData[date].conversions += row.metrics.conversions;
        dailyData[date].revenue += row.metrics.conversions_value;
      }

      return Object.values(dailyData);
    } catch (error) {
      console.error('Error fetching daily performance:', error);
      throw error;
    }
  }
}

module.exports = GoogleAdsService;
```

---

## 🌐 PART 6: Create API Endpoints

### Step 6.1: Create Routes

Create file: `routes/analytics.js`

```javascript
const express = require('express');
const router = express.Router();
const GoogleAdsService = require('../services/GoogleAdsService');

const googleAds = new GoogleAdsService();

/**
 * Helper function to get date range
 */
function getDateRange(req) {
  const { startDate, endDate, period } = req.query;
  
  if (startDate && endDate) {
    return { startDate, endDate };
  }
  
  // Default to last 30 days
  const end = new Date();
  const start = new Date();
  
  switch (period) {
    case 'today':
      start.setDate(start.getDate());
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case '7days':
      start.setDate(start.getDate() - 7);
      break;
    case '30days':
    default:
      start.setDate(start.getDate() - 30);
  }
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

/**
 * GET /api/analytics/summary
 * Get overall campaign performance summary
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const summary = await googleAds.getCampaignSummary(startDate, endDate);
    
    res.json({
      success: true,
      period: { startDate, endDate },
      data: summary
    });
  } catch (error) {
    console.error('Error in summary endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/campaigns
 * Get all campaigns with metrics
 */
router.get('/campaigns', async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const campaigns = await googleAds.getCampaigns(startDate, endDate);
    
    res.json({
      success: true,
      period: { startDate, endDate },
      count: campaigns.length,
      data: campaigns
    });
  } catch (error) {
    console.error('Error in campaigns endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/campaigns/:campaignId/adgroups
 * Get ad groups for a specific campaign
 */
router.get('/campaigns/:campaignId/adgroups', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = getDateRange(req);
    
    const adGroups = await googleAds.getAdGroups(campaignId, startDate, endDate);
    
    res.json({
      success: true,
      period: { startDate, endDate },
      campaignId: campaignId,
      count: adGroups.length,
      data: adGroups
    });
  } catch (error) {
    console.error('Error in ad groups endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/keywords
 * Get top performing keywords
 */
router.get('/keywords', async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const limit = parseInt(req.query.limit) || 20;
    
    const keywords = await googleAds.getKeywords(startDate, endDate, limit);
    
    res.json({
      success: true,
      period: { startDate, endDate },
      count: keywords.length,
      data: keywords
    });
  } catch (error) {
    console.error('Error in keywords endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/products
 * Get product performance (for Shopping campaigns)
 */
router.get('/products', async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const limit = parseInt(req.query.limit) || 50;
    
    const products = await googleAds.getProductPerformance(startDate, endDate, limit);
    
    res.json({
      success: true,
      period: { startDate, endDate },
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error in products endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/daily
 * Get daily performance trend
 */
router.get('/daily', async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const dailyData = await googleAds.getDailyPerformance(startDate, endDate);
    
    res.json({
      success: true,
      period: { startDate, endDate },
      count: dailyData.length,
      data: dailyData
    });
  } catch (error) {
    console.error('Error in daily performance endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

### Step 6.2: Create Main Server File

Create file: `server.js`

```javascript
require('dotenv').config();
const express = require('express');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Google Ads Analytics API',
    version: '1.0.0',
    endpoints: {
      summary: '/api/analytics/summary',
      campaigns: '/api/analytics/campaigns',
      keywords: '/api/analytics/keywords',
      products: '/api/analytics/products',
      daily: '/api/analytics/daily'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         Google Ads Analytics API Server                   ║
╚════════════════════════════════════════════════════════════╝

✓ Server running on: http://localhost:${PORT}
✓ Health check: http://localhost:${PORT}/health

Available Endpoints:
─────────────────────────────────────────────────────────────
• Summary:    GET /api/analytics/summary
• Campaigns:  GET /api/analytics/campaigns
• Keywords:   GET /api/analytics/keywords
• Products:   GET /api/analytics/products
• Daily Data: GET /api/analytics/daily

Query Parameters:
─────────────────────────────────────────────────────────────
• startDate=YYYY-MM-DD
• endDate=YYYY-MM-DD
• period=today|yesterday|7days|30days (default: 30days)
• limit=number (for keywords and products)

Example:
─────────────────────────────────────────────────────────────
http://localhost:${PORT}/api/analytics/summary?period=7days

Press Ctrl+C to stop
  `);
});
```

---

## 🎮 PART 7: Test Your API

### Step 7.1: Start the Server

```bash
npm run dev
```

You should see:
```
✓ Server running on: http://localhost:3000
✓ Health check: http://localhost:3000/health
```

### Step 7.2: Test Endpoints

Open your browser or use curl/Postman:

**1. Get Summary (Last 30 days)**
```
http://localhost:3000/api/analytics/summary
```

**2. Get Summary (Last 7 days)**
```
http://localhost:3000/api/analytics/summary?period=7days
```

**3. Get All Campaigns**
```
http://localhost:3000/api/analytics/campaigns
```

**4. Get Top Keywords**
```
http://localhost:3000/api/analytics/keywords?limit=10
```

**5. Get Product Performance**
```
http://localhost:3000/api/analytics/products
```

**6. Get Daily Trend**
```
http://localhost:3000/api/analytics/daily?startDate=2026-01-01&endDate=2026-01-28
```

### Step 7.3: Example Response

**GET /api/analytics/summary?period=7days**

```json
{
  "success": true,
  "period": {
    "startDate": "2026-01-21",
    "endDate": "2026-01-28"
  },
  "data": {
    "totalCost": 245.67,
    "totalClicks": 1234,
    "totalImpressions": 45678,
    "totalConversions": 89,
    "totalRevenue": 1567.89,
    "roas": "6.38",
    "roi": "538.08",
    "avgCpc": "0.20",
    "conversionRate": "7.21",
    "avgCtr": "2.70",
    "activeCampaigns": 3,
    "totalCampaigns": 5
  }
}
```

---

## 🎯 PART 8: Quick Reference Scripts

### Create Helper Scripts for Common Tasks

Create file: `scripts/2-quickStats.js`

```javascript
const GoogleAdsService = require('../services/GoogleAdsService');
require('dotenv').config();

async function showQuickStats() {
  const googleAds = new GoogleAdsService();
  
  // Last 7 days
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  console.log('\n📊 Quick Stats (Last 7 Days)\n');
  console.log(`Period: ${startDate} to ${endDate}\n`);

  try {
    const summary = await googleAds.getCampaignSummary(startDate, endDate);
    
    console.log('Performance Summary:');
    console.log('─────────────────────────────────────────────');
    console.log(`💰 Total Spend: $${summary.totalCost.toFixed(2)}`);
    console.log(`💵 Total Revenue: $${summary.totalRevenue.toFixed(2)}`);
    console.log(`📈 ROI: ${summary.roi}%`);
    console.log(`🎯 ROAS: ${summary.roas}x`);
    console.log(`👆 Clicks: ${summary.totalClicks}`);
    console.log(`👁️  Impressions: ${summary.totalImpressions}`);
    console.log(`✅ Conversions: ${summary.totalConversions}`);
    console.log(`📊 Conversion Rate: ${summary.conversionRate}%`);
    console.log(`💲 Avg CPC: $${summary.avgCpc}`);
    console.log('─────────────────────────────────────────────\n');

    const campaigns = await googleAds.getCampaigns(startDate, endDate);
    
    console.log('Top 5 Campaigns by Spend:');
    console.log('─────────────────────────────────────────────');
    campaigns.slice(0, 5).forEach((campaign, i) => {
      console.log(`${i + 1}. ${campaign.name}`);
      console.log(`   Spend: $${campaign.cost.toFixed(2)} | Revenue: $${campaign.revenue.toFixed(2)}`);
    });
    console.log('─────────────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

showQuickStats();
```

Run it:
```bash
node scripts/2-quickStats.js
```

---

## 📚 PART 9: Complete File Structure

Your final project structure:

```
google-ads-integration/
├── node_modules/
├── scripts/
│   ├── 1-generateRefreshToken.js    # OAuth token generator
│   ├── 2-quickStats.js               # Quick stats viewer
│   └── 3-testConnection.js           # Connection tester
├── services/
│   └── GoogleAdsService.js           # Google Ads API wrapper
├── routes/
│   └── analytics.js                  # API routes
├── .env                              # Your credentials (DON'T COMMIT!)
├── .gitignore                        # Git ignore file
├── package.json                      # Dependencies
└── server.js                         # Main server file
```

### Create .gitignore

Create file: `.gitignore`

```
node_modules/
.env
.DS_Store
*.log
```

---

## ✅ Final Checklist

- [x] Google Cloud project created
- [x] Google Ads API enabled
- [x] OAuth credentials obtained
- [x] Developer token retrieved
- [x] Customer ID found
- [x] Refresh token generated
- [x] All credentials in .env file
- [x] Connection tested successfully
- [x] Server running
- [x] API endpoints working

---

## 🎉 You're Done!

You now have a fully functional Google Ads integration that can:

✅ Authenticate with Google Ads API (OAuth)  
✅ Fetch campaign performance data  
✅ Get product-specific metrics  
✅ Calculate ROI and ROAS  
✅ Provide daily trend analysis  
✅ Track keywords and ad groups  

## 🚀 Next Steps

1. **Integrate with Shopify** (from the first guide)
2. **Build a dashboard** to visualize the data
3. **Set up automated reports** (daily/weekly emails)
4. **Add alerts** for underperforming campaigns
5. **Create optimization recommendations**

## 💡 Pro Tips

- The refresh token lasts forever (unless revoked)
- You can use the same credentials in multiple environments
- Cache frequently accessed data to reduce API calls
- Google Ads API has rate limits - don't overquery
- Test with small date ranges first

---

## 🆘 Troubleshooting

**Issue: "UNAUTHENTICATED" error**
- Solution: Regenerate refresh token (`npm run setup`)

**Issue: "PERMISSION_DENIED"**
- Solution: Check your developer token and customer ID

**Issue: No data returned**
- Solution: Make sure you have active campaigns with data in the date range

**Issue: "Invalid customer ID"**
- Solution: Remove dashes from customer ID (123-456-7890 → 1234567890)

---

Need help? The connection test script (`npm test`) will guide you through any issues!