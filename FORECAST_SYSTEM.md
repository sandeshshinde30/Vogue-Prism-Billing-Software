# 📊 Business Forecast System - Complete Documentation

## 🎯 Overview

This is a **pure data mining forecast system** built for clothing store owners. It uses only mathematical models and statistical analysis - NO AI/ML libraries, NO external APIs.

**Key Features:**
- ✅ Sales trend analysis (daily, weekly, monthly)
- ✅ Linear regression forecasting (7 & 30 days)
- ✅ Day-of-week pattern detection
- ✅ Product performance & demand forecasting
- ✅ Category analysis
- ✅ Payment method trends
- ✅ Stock restock priority system
- ✅ Confidence scoring based on data quality

---

## 📈 Mathematical Models Used

### 1. **Linear Regression** (Mandatory)
```
Formula: y = mx + b
- m (slope) = trend direction & strength
- b (intercept) = baseline sales
- R² = accuracy (0-1, higher is better)
```

**What it tells you:**
- Positive slope = Sales increasing
- Negative slope = Sales decreasing
- R² > 0.8 = Very reliable forecast
- R² < 0.4 = Unreliable (need more data)

### 2. **Moving Averages**
```
7-Day MA: Average of last 7 days
30-Day MA: Average of last 30 days
```

**Why it matters:**
- Smooths out daily fluctuations
- Shows true trend direction
- Helps identify seasonal patterns

### 3. **Standard Deviation & Variance**
```
Measures how much sales vary day-to-day
- Low variance = Stable, predictable sales
- High variance = Unpredictable, volatile sales
```

### 4. **Coefficient of Variation (CV)**
```
CV = (Standard Deviation / Mean) × 100
- CV < 15% = Very stable
- CV 15-30% = Moderate
- CV > 30% = Highly variable
```

**Used for:** Confidence level calculation

### 5. **Growth Rate Calculation**
```
Growth % = ((New Value - Old Value) / Old Value) × 100
```

**Applied to:**
- Product sales growth
- Category performance
- Payment method trends

---

## 📊 Data Analysis Breakdown

### SUMMARY SECTION
```json
{
  "totalSales": "Total revenue from all bills",
  "avgDailySales": "Average daily sales amount",
  "totalBills": "Number of transactions",
  "dataPoints": "Number of days with sales data",
  "dateRange": "From-To dates of analysis"
}
```

### TRENDS SECTION

#### Daily Trend
- **sales**: Actual daily sales
- **ma7**: 7-day moving average (smoothed trend)
- **ma30**: 30-day moving average (long-term trend)

#### Regression Analysis
```
slope: ₹X per day (trend strength)
slopeExplanation: "Sales increasing/decreasing by X% daily"
rSquared: 0.0-1.0 (accuracy score)
accuracy: "Very High/High/Medium/Low"
forecast7Days: Next 7 days predictions
forecast30Days: Next 30 days predictions
```

### WEEKLY PATTERN SECTION

Shows which days are best/worst for sales:
```
Monday: ₹5,000 (Medium performance)
Saturday: ₹8,500 (High performance)
```

**Weekend vs Weekday:**
- If weekend > weekday by 30% → Stock up before weekends
- If weekday > weekend → Plan weekday promotions

### PRODUCTS SECTION

#### Top Selling
- Products with highest revenue
- Quantity sold
- Category

#### Slow Moving
- Products with low sales
- Days in stock
- Revenue generated

#### Forecast & Restock Priority
```
Priority = High: Restock URGENT
Priority = Medium: Restock soon
Priority = Low: Adequate stock
```

**Calculation:**
- High: Days until stockout < 7 OR forecast > 50 units
- Medium: Days until stockout < 14 OR forecast > 20 units
- Low: Otherwise

### CATEGORIES SECTION

Performance by product category:
- Revenue generated
- Units sold
- Average price per unit
- Growth rate

### PAYMENTS SECTION

#### Distribution
- Cash vs UPI vs Card percentages
- Average transaction value per method

#### Trends
- Which payment method is growing
- Which is declining
- Trend direction (Increasing/Stable/Decreasing)

### SEASONALITY SECTION

#### Weekly Pattern
"Weekend sales are 30% higher than weekdays"

#### Peak Days
Days with highest sales (e.g., Saturday, Sunday)

#### Low Days
Days with lowest sales (e.g., Monday, Tuesday)

### CONFIDENCE SECTION

```
Level: Low / Medium / High
Reason: "Data consistency: 85%. 45 days of sales data."
dataQuality: 0-100 (percentage)
```

**Confidence Calculation:**
- Data points < 7 days = Low
- CV > 50% = Low
- CV 30-50% = Medium
- CV < 30% = High

---

## 🎯 How to Use This Data

### For Sales Planning
1. Check **Trends** → See if sales are increasing/decreasing
2. Check **Weekly Pattern** → Plan staffing for peak days
3. Check **Forecast** → Prepare for predicted sales volume

### For Stock Management
1. Go to **Products** → **Restock Priority**
2. **High Priority** items = Order immediately
3. **Medium Priority** = Order within 3-5 days
4. **Low Priority** = Monitor but no urgent action

### For Marketing
1. Check **Weekly Pattern** → Promote on low days
2. Check **Categories** → Focus on top-performing categories
3. Check **Payment Trends** → Offer discounts for growing payment methods

### For Financial Planning
1. Check **Forecast** → Plan cash flow for next 30 days
2. Check **Payments** → Understand payment method distribution
3. Check **Categories** → Allocate budget to top performers

---

## 📱 Frontend Display

### Overview Tab
- Weekly sales pattern (bar chart)
- Top selling products (list)
- Key insights (actionable recommendations)

### Trends Tab
- Daily sales trend (line chart with moving averages)
- 30-day forecast (area chart)
- Monthly performance (bar chart)

### Products Tab
- Restock priority (color-coded: Red/Yellow/Green)
- Slow moving items
- Category performance table

### Payments Tab
- Payment method distribution (pie chart)
- Payment trends (growth percentages)

---

## 🔢 Example Calculations

### Example 1: Linear Regression
```
Sales data: [1000, 1100, 1050, 1200, 1300, 1250, 1400]

Slope = 42.86 (sales increasing by ~₹43/day)
Intercept = 1000
R² = 0.92 (92% accuracy - VERY HIGH)

Forecast for day 8:
y = 1000 + 42.86 × 8 = 1342.88 ≈ ₹1,343
```

### Example 2: Confidence Level
```
Sales data: [5000, 5100, 4900, 5200, 5050, 5150, 4950]
Mean = 5057
Std Dev = 106
CV = (106 / 5057) × 100 = 2.1%

CV < 15% → Confidence = HIGH ✅
Data Quality = 97.9%
```

### Example 3: Growth Rate
```
First half average: ₹5,000/day
Second half average: ₹5,500/day

Growth = ((5500 - 5000) / 5000) × 100 = 10%
Trend = Increasing ↑
```

---

## ⚠️ Important Notes

### Data Quality Matters
- **Less than 7 days data** = Low confidence
- **More than 30 days data** = Better accuracy
- **More than 90 days data** = Excellent accuracy

### Limitations
- Forecasts assume past patterns continue
- Cannot predict sudden market changes
- Seasonal events (festivals, sales) may skew data
- External factors (weather, competition) not considered

### Best Practices
1. Review forecast weekly
2. Compare predictions with actual results
3. Adjust stock based on forecast + experience
4. Use insights as guidance, not absolute rules
5. Monitor confidence level - low confidence = be cautious

---

## 🛠️ Technical Details

### Database Tables Used
- `bills` - Sales transactions
- `bill_items` - Individual items in bills
- `products` - Product information
- `stock_logs` - Stock movement history

### Calculations Performed
1. Daily sales aggregation
2. Day-of-week grouping
3. Monthly aggregation
4. Linear regression analysis
5. Moving average calculation
6. Standard deviation & variance
7. Growth rate calculation
8. Confidence scoring
9. Restock priority assignment
10. Insight generation

### Performance
- Processes all historical data
- Generates forecast in < 1 second
- No external API calls
- Pure mathematical computation

---

## 📞 Support

For questions about specific metrics:
- **Slope**: Trend direction (positive = up, negative = down)
- **R²**: How accurate the forecast is (0-1 scale)
- **CV**: How stable your sales are (lower = more stable)
- **Confidence**: How much to trust the forecast (Low/Medium/High)

---

**Last Updated:** March 2026
**System:** Pure Data Mining (No AI/ML)
**Language:** TypeScript
**Database:** SQLite
