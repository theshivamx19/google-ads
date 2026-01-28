# Google Ads + Shopify Integration for ROI Tracking

## Overview
This guide shows how to track Google Ads performance against Shopify sales to determine ad ROI and optimize spend.

## Prerequisites
- Google Ads account
- Shopify store
- Node.js application
- Google Cloud project

## Architecture

```
Google Ads → Conversion Tracking → User Purchase → Shopify Order
     ↓                                                    ↓
Ad Spend Data ←────────── Your Node.js App ──────→ Sales Data
     ↓                                                    ↓
              ROI Analysis & Optimization Decisions
```

## Part 1: Google Ads Conversion Tracking Setup

### 1.1 Create Conversion Action in Google Ads

1. Go to Google Ads → Tools & Settings → Conversions
2. Click "+" to create new conversion action
3. Select "Website" → "Purchase"
4. Set conversion value to track revenue
5. Get your Conversion ID and Conversion Label

### 1.2 Install Google Tag (gtag.js) in Shopify

**In Shopify Admin:**
1. Go to Settings → Checkout → Order status page
2. Add this script in "Additional scripts" section:

```html
<!-- Google Ads Conversion Tracking -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-CONVERSION_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-CONVERSION_ID');
  
  // Track purchase conversion
  gtag('event', 'conversion', {
    'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL',
    'value': {{ total_price | money_without_currency }},
    'currency': '{{ currency }}',
    'transaction_id': '{{ order_number }}'
  });
</script>
```

Replace:
- `AW-CONVERSION_ID` with your Google Ads Conversion ID
- `CONVERSION_LABEL` with your conversion label

## Part 2: Node.js Backend Implementation

### 2.1 Install Required Packages

```bash
npm install google-ads-api @shopify/shopify-api dotenv express
```

### 2.2 Environment Variables

Create `.env` file:

```env
# Google Ads API
GOOGLE_ADS_CLIENT_ID=your-client-id
GOOGLE_ADS_CLIENT_SECRET=your-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
GOOGLE_ADS_REFRESH_TOKEN=your-refresh-token
GOOGLE_ADS_CUSTOMER_ID=your-customer-id

# Shopify
SHOPIFY_SHOP_NAME=your-shop-name
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
SHOPIFY_ACCESS_TOKEN=your-access-token

PORT=3000
```

### 2.3 Google Ads Service

Create `services/googleAdsService.js`:

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
   * Get ad spend for a specific date range
   */
  async getAdSpend(startDate, endDate) {
    try {
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status = 'ENABLED'
      `;

      const results = await this.customer.query(query);
      
      const campaigns = [];
      for (const row of results) {
        campaigns.push({
          campaignId: row.campaign.id,
          campaignName: row.campaign.name,
          cost: row.metrics.cost_micros / 1_000_000, // Convert micros to currency
          clicks: row.metrics.clicks,
          impressions: row.metrics.impressions,
          conversions: row.metrics.conversions,
          conversionValue: row.metrics.conversions_value,
        });
      }

      return campaigns;
    } catch (error) {
      console.error('Error fetching ad spend:', error);
      throw error;
    }
  }

  /**
   * Get product-specific ad performance
   */
  async getProductAdPerformance(productId, startDate, endDate) {
    try {
      const query = `
        SELECT
          shopping_performance_view.product_item_id,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.conversions_value
        FROM shopping_performance_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND shopping_performance_view.product_item_id = '${productId}'
      `;

      const results = await this.customer.query(query);
      
      let totalCost = 0;
      let totalConversions = 0;
      let totalRevenue = 0;

      for (const row of results) {
        totalCost += row.metrics.cost_micros / 1_000_000;
        totalConversions += row.metrics.conversions;
        totalRevenue += row.metrics.conversions_value;
      }

      return {
        productId,
        adSpend: totalCost,
        conversions: totalConversions,
        revenue: totalRevenue,
        roas: totalCost > 0 ? totalRevenue / totalCost : 0,
      };
    } catch (error) {
      console.error('Error fetching product ad performance:', error);
      throw error;
    }
  }

  /**
   * Get overall campaign performance summary
   */
  async getCampaignSummary(startDate, endDate) {
    const campaigns = await this.getAdSpend(startDate, endDate);
    
    const summary = campaigns.reduce((acc, campaign) => ({
      totalSpend: acc.totalSpend + campaign.cost,
      totalClicks: acc.totalClicks + campaign.clicks,
      totalImpressions: acc.totalImpressions + campaign.impressions,
      totalConversions: acc.totalConversions + campaign.conversions,
      totalRevenue: acc.totalRevenue + campaign.conversionValue,
    }), {
      totalSpend: 0,
      totalClicks: 0,
      totalImpressions: 0,
      totalConversions: 0,
      totalRevenue: 0,
    });

    summary.roas = summary.totalSpend > 0 ? summary.totalRevenue / summary.totalSpend : 0;
    summary.cpc = summary.totalClicks > 0 ? summary.totalSpend / summary.totalClicks : 0;
    summary.conversionRate = summary.totalClicks > 0 ? (summary.totalConversions / summary.totalClicks) * 100 : 0;

    return summary;
  }
}

module.exports = GoogleAdsService;
```

### 2.4 Shopify Service

Create `services/shopifyService.js`:

```javascript
const { Shopify } = require('@shopify/shopify-api');

class ShopifyService {
  constructor() {
    this.shopify = new Shopify.Clients.Rest(
      process.env.SHOPIFY_SHOP_NAME,
      process.env.SHOPIFY_ACCESS_TOKEN
    );
  }

  /**
   * Get orders for a specific date range
   */
  async getOrders(startDate, endDate) {
    try {
      const response = await this.shopify.get({
        path: 'orders',
        query: {
          status: 'any',
          created_at_min: startDate,
          created_at_max: endDate,
          limit: 250,
        },
      });

      return response.body.orders;
    } catch (error) {
      console.error('Error fetching Shopify orders:', error);
      throw error;
    }
  }

  /**
   * Get sales data for a specific product
   */
  async getProductSales(productId, startDate, endDate) {
    try {
      const orders = await this.getOrders(startDate, endDate);
      
      let totalRevenue = 0;
      let totalQuantity = 0;
      let orderCount = 0;

      orders.forEach(order => {
        order.line_items.forEach(item => {
          if (item.product_id.toString() === productId.toString()) {
            totalRevenue += parseFloat(item.price) * item.quantity;
            totalQuantity += item.quantity;
            orderCount++;
          }
        });
      });

      return {
        productId,
        revenue: totalRevenue,
        quantity: totalQuantity,
        orderCount,
        averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
      };
    } catch (error) {
      console.error('Error fetching product sales:', error);
      throw error;
    }
  }

  /**
   * Get product details
   */
  async getProduct(productId) {
    try {
      const response = await this.shopify.get({
        path: `products/${productId}`,
      });

      return response.body.product;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }
}

module.exports = ShopifyService;
```

### 2.5 ROI Analysis Service

Create `services/roiAnalysisService.js`:

```javascript
class ROIAnalysisService {
  /**
   * Calculate ROI for a product
   */
  calculateProductROI(adData, salesData) {
    const roi = {
      productId: adData.productId,
      adSpend: adData.adSpend,
      revenue: salesData.revenue,
      profit: salesData.revenue - adData.adSpend,
      roi: adData.adSpend > 0 ? ((salesData.revenue - adData.adSpend) / adData.adSpend) * 100 : 0,
      roas: adData.roas,
      quantity: salesData.quantity,
      orderCount: salesData.orderCount,
    };

    // Add recommendation
    roi.recommendation = this.getRecommendation(roi);

    return roi;
  }

  /**
   * Get spending recommendation based on performance
   */
  getRecommendation(roi) {
    if (roi.roi > 100) {
      return {
        action: 'INCREASE_BUDGET',
        message: `Strong performance! ROI is ${roi.roi.toFixed(2)}%. Consider increasing ad spend by 20-30%.`,
        suggestedBudgetChange: 0.25,
      };
    } else if (roi.roi > 30) {
      return {
        action: 'MAINTAIN_BUDGET',
        message: `Good performance. ROI is ${roi.roi.toFixed(2)}%. Maintain current budget and monitor.`,
        suggestedBudgetChange: 0,
      };
    } else if (roi.roi > 0) {
      return {
        action: 'OPTIMIZE',
        message: `Low ROI (${roi.roi.toFixed(2)}%). Review ad targeting and creative. Consider A/B testing.`,
        suggestedBudgetChange: 0,
      };
    } else {
      return {
        action: 'DECREASE_BUDGET',
        message: `Negative ROI (${roi.roi.toFixed(2)}%). Consider reducing spend by 30-50% or pausing campaign.`,
        suggestedBudgetChange: -0.4,
      };
    }
  }

  /**
   * Compare multiple products
   */
  compareProducts(productsROI) {
    return productsROI
      .sort((a, b) => b.roi - a.roi)
      .map((product, index) => ({
        ...product,
        rank: index + 1,
      }));
  }
}

module.exports = ROIAnalysisService;
```

### 2.6 API Routes

Create `routes/analytics.js`:

```javascript
const express = require('express');
const router = express.Router();
const GoogleAdsService = require('../services/googleAdsService');
const ShopifyService = require('../services/shopifyService');
const ROIAnalysisService = require('../services/roiAnalysisService');

const googleAds = new GoogleAdsService();
const shopify = new ShopifyService();
const roiAnalysis = new ROIAnalysisService();

/**
 * GET /api/analytics/product/:productId
 * Get ROI analysis for a specific product
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required (format: YYYY-MM-DD)' 
      });
    }

    // Fetch data from both sources in parallel
    const [adData, salesData, product] = await Promise.all([
      googleAds.getProductAdPerformance(productId, startDate, endDate),
      shopify.getProductSales(productId, startDate, endDate),
      shopify.getProduct(productId),
    ]);

    // Calculate ROI
    const roi = roiAnalysis.calculateProductROI(adData, salesData);

    res.json({
      product: {
        id: product.id,
        title: product.title,
      },
      period: { startDate, endDate },
      performance: roi,
    });
  } catch (error) {
    console.error('Error in product analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

/**
 * GET /api/analytics/campaign-summary
 * Get overall campaign performance
 */
router.get('/campaign-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required (format: YYYY-MM-DD)' 
      });
    }

    const summary = await googleAds.getCampaignSummary(startDate, endDate);

    res.json({
      period: { startDate, endDate },
      summary,
    });
  } catch (error) {
    console.error('Error in campaign summary:', error);
    res.status(500).json({ error: 'Failed to fetch campaign summary' });
  }
});

/**
 * GET /api/analytics/compare
 * Compare multiple products
 */
router.get('/compare', async (req, res) => {
  try {
    const { productIds, startDate, endDate } = req.query;

    if (!productIds || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'productIds (comma-separated), startDate, and endDate are required' 
      });
    }

    const ids = productIds.split(',');
    const results = await Promise.all(
      ids.map(async (productId) => {
        const [adData, salesData] = await Promise.all([
          googleAds.getProductAdPerformance(productId.trim(), startDate, endDate),
          shopify.getProductSales(productId.trim(), startDate, endDate),
        ]);
        return roiAnalysis.calculateProductROI(adData, salesData);
      })
    );

    const comparison = roiAnalysis.compareProducts(results);

    res.json({
      period: { startDate, endDate },
      comparison,
    });
  } catch (error) {
    console.error('Error in product comparison:', error);
    res.status(500).json({ error: 'Failed to compare products' });
  }
});

module.exports = router;
```

### 2.7 Main Server File

Create `server.js`:

```javascript
require('dotenv').config();
const express = require('express');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Part 3: Getting Google Ads API Credentials

### 3.1 Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create new project
3. Enable Google Ads API

### 3.2 Get OAuth Credentials
1. Go to APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Download credentials (client_id and client_secret)

### 3.3 Get Developer Token
1. Go to Google Ads → Tools → API Center
2. Request developer token (basic access is fine for testing)

### 3.4 Generate Refresh Token
Use this script `scripts/getRefreshToken.js`:

```javascript
const readline = require('readline');
const { google } = require('googleapis');

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_ADS_CLIENT_ID,
  process.env.GOOGLE_ADS_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const scopes = ['https://www.googleapis.com/auth/adwords'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Your refresh token is:', token.refresh_token);
  });
});
```

## Part 4: Usage Examples

### Example 1: Check Product ROI

```bash
GET http://localhost:3000/api/analytics/product/123456789?startDate=2026-01-01&endDate=2026-01-28
```

Response:
```json
{
  "product": {
    "id": "123456789",
    "title": "Premium Wireless Headphones"
  },
  "period": {
    "startDate": "2026-01-01",
    "endDate": "2026-01-28"
  },
  "performance": {
    "productId": "123456789",
    "adSpend": 200,
    "revenue": 850,
    "profit": 650,
    "roi": 325,
    "roas": 4.25,
    "quantity": 17,
    "orderCount": 15,
    "recommendation": {
      "action": "INCREASE_BUDGET",
      "message": "Strong performance! ROI is 325.00%. Consider increasing ad spend by 20-30%.",
      "suggestedBudgetChange": 0.25
    }
  }
}
```

### Example 2: Compare Multiple Products

```bash
GET http://localhost:3000/api/analytics/compare?productIds=123,456,789&startDate=2026-01-01&endDate=2026-01-28
```

## Part 5: Dashboard Integration (Optional)

You can create a simple frontend dashboard to visualize this data. Here's a React component example:

```javascript
// ProductROIDashboard.jsx
import React, { useState, useEffect } from 'react';

function ProductROIDashboard({ productId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const response = await fetch(
        `/api/analytics/product/${productId}?startDate=${startDate}&endDate=${endDate}`
      );
      const result = await response.json();
      setData(result);
      setLoading(false);
    };

    fetchData();
  }, [productId]);

  if (loading) return <div>Loading...</div>;

  const { performance } = data;

  return (
    <div className="roi-dashboard">
      <h2>{data.product.title}</h2>
      
      <div className="metrics">
        <div className="metric">
          <h3>Ad Spend</h3>
          <p>${performance.adSpend.toFixed(2)}</p>
        </div>
        
        <div className="metric">
          <h3>Revenue</h3>
          <p>${performance.revenue.toFixed(2)}</p>
        </div>
        
        <div className="metric">
          <h3>Profit</h3>
          <p className={performance.profit > 0 ? 'positive' : 'negative'}>
            ${performance.profit.toFixed(2)}
          </p>
        </div>
        
        <div className="metric">
          <h3>ROI</h3>
          <p className={performance.roi > 0 ? 'positive' : 'negative'}>
            {performance.roi.toFixed(2)}%
          </p>
        </div>
        
        <div className="metric">
          <h3>ROAS</h3>
          <p>{performance.roas.toFixed(2)}x</p>
        </div>
      </div>

      <div className="recommendation">
        <h3>Recommendation</h3>
        <div className={`action ${performance.recommendation.action.toLowerCase()}`}>
          {performance.recommendation.message}
        </div>
      </div>
    </div>
  );
}

export default ProductROIDashboard;
```

## Key Metrics Explained

- **ROI (Return on Investment)**: (Revenue - Ad Spend) / Ad Spend × 100
  - Above 100%: Profitable
  - Below 0%: Losing money

- **ROAS (Return on Ad Spend)**: Revenue / Ad Spend
  - 4.0 means you get $4 for every $1 spent
  - Minimum target: 2.0-3.0

- **CPC (Cost Per Click)**: Total Spend / Total Clicks

- **Conversion Rate**: (Conversions / Clicks) × 100

## Next Steps

1. Set up automated daily reports
2. Add email alerts for poor performing products
3. Implement A/B testing tracking
4. Add profit margin calculations
5. Create weekly optimization recommendations

## Troubleshooting

- **No conversion data**: Check if conversion tracking pixel is properly installed
- **API errors**: Verify all credentials and tokens are correct
- **Missing orders**: Check date format and Shopify API permissions