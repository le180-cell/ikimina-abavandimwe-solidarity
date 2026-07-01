"""
EliteFlow AI Insights Service
FastAPI microservice for demand forecasting, anomaly detection, and business insights.
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sklearn.linear_model import LinearRegression

load_dotenv()

app = FastAPI(
    title="EliteFlow AI Insights",
    description="AI-powered analytics for sales, stock, and business performance",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# DATA MODELS
# ============================================

class SalesDataPoint(BaseModel):
    date: str
    total: float
    count: int

class ProductSales(BaseModel):
    product_id: str
    product_name: str
    daily_sales: list[SalesDataPoint]

class DemandForecastRequest(BaseModel):
    sales_history: list[SalesDataPoint]
    days_ahead: int = 30

class DemandForecastResponse(BaseModel):
    forecast: list[dict]
    trend: str
    confidence: float
    recommendation: str

class StockAlertRequest(BaseModel):
    product_id: str
    product_name: str
    current_stock: int
    avg_daily_sales: float
    lead_time_days: int = 7

class StockAlertResponse(BaseModel):
    product_id: str
    product_name: str
    days_until_out: int
    reorder_point: int
    suggested_order_qty: int
    urgency: str

class AnomalyRequest(BaseModel):
    sales_data: list[SalesDataPoint]

class AnomalyResponse(BaseModel):
    anomalies: list[dict]
    summary: str

class InsightRequest(BaseModel):
    total_revenue: float
    total_cost: float
    transaction_count: int
    active_products: int
    customer_count: int
    credit_sales: float
    low_stock_count: int

class InsightResponse(BaseModel):
    health_score: float
    profit_margin: float
    avg_order_value: float
    recommendations: list[str]

# ============================================
# ENGINE
# ============================================

class InsightEngine:
    @staticmethod
    def forecast_demand(sales: list[SalesDataPoint], days_ahead: int = 30) -> DemandForecastResponse:
        if len(sales) < 3:
            return DemandForecastResponse(
                forecast=[{"day": i + 1, "predicted": 0} for i in range(days_ahead)],
                trend="insufficient_data",
                confidence=0.0,
                recommendation="Need more sales data (at least 3 days) to generate forecast."
            )

        sorted_sales = sorted(sales, key=lambda x: x.date)
        X = np.arange(len(sorted_sales)).reshape(-1, 1)
        y = np.array([s.total for s in sorted_sales])

        model = LinearRegression()
        model.fit(X, y)

        future_X = np.arange(len(sorted_sales), len(sorted_sales) + days_ahead).reshape(-1, 1)
        predictions = model.predict(future_X)
        predictions = np.maximum(predictions, 0)

        forecast = [
            {"day": i + 1, "predicted": round(float(predictions[i]), 0)}
            for i in range(days_ahead)
        ]

        trend = "upward" if model.coef_[0] > 0 else "downward" if model.coef_[0] < 0 else "stable"

        # R-squared for confidence
        y_mean = np.mean(y)
        ss_total = np.sum((y - y_mean) ** 2)
        ss_residual = np.sum((y - model.predict(X)) ** 2)
        r_squared = 1 - (ss_residual / ss_total) if ss_total > 0 else 0

        avg_prediction = float(np.mean(predictions))
        if trend == "upward":
            recommendation = f"Sales trending upward. Average predicted daily revenue: {avg_prediction:,.0f} RWF. Consider increasing stock levels."
        elif trend == "downward":
            recommendation = f"Sales declining. Average predicted daily revenue: {avg_prediction:,.0f} RWF. Consider promotions or reviewing pricing."
        else:
            recommendation = f"Sales stable at approximately {avg_prediction:,.0f} RWF/day. Maintain current inventory levels."

        return DemandForecastResponse(
            forecast=forecast,
            trend=trend,
            confidence=round(float(r_squared), 2),
            recommendation=recommendation,
        )

    @staticmethod
    def analyze_stock(
        product_id: str,
        product_name: str,
        current_stock: int,
        avg_daily_sales: float,
        lead_time_days: int = 7,
    ) -> StockAlertResponse:
        if avg_daily_sales <= 0:
            return StockAlertResponse(
                product_id=product_id,
                product_name=product_name,
                days_until_out=999,
                reorder_point=0,
                suggested_order_qty=0,
                urgency="none",
            )

        days_until_out = int(current_stock / avg_daily_sales) if avg_daily_sales > 0 else 999
        reorder_point = int(avg_daily_sales * lead_time_days * 1.5)
        suggested_order_qty = max(int(reorder_point - current_stock + avg_daily_sales * 14), 0)

        if days_until_out <= lead_time_days:
            urgency = "critical"
        elif days_until_out <= lead_time_days * 2:
            urgency = "warning"
        elif days_until_out <= lead_time_days * 3:
            urgency = "watch"
        else:
            urgency = "healthy"

        return StockAlertResponse(
            product_id=product_id,
            product_name=product_name,
            days_until_out=days_until_out,
            reorder_point=reorder_point,
            suggested_order_qty=suggested_order_qty,
            urgency=urgency,
        )

    @staticmethod
    def detect_anomalies(sales: list[SalesDataPoint]) -> AnomalyResponse:
        if len(sales) < 7:
            return AnomalyResponse(anomalies=[], summary="Need at least 7 days of data for anomaly detection.")

        sorted_sales = sorted(sales, key=lambda x: x.date)
        values = np.array([s.total for s in sorted_sales])

        mean = np.mean(values)
        std = np.std(values)
        threshold = 2.0

        anomalies = []
        for s in sorted_sales:
            z_score = (s.total - mean) / std if std > 0 else 0
            if abs(z_score) > threshold:
                anomalies.append({
                    "date": s.date,
                    "value": s.total,
                    "z_score": round(float(z_score), 2),
                    "type": "spike" if z_score > 0 else "drop",
                })

        if len(anomalies) == 0:
            summary = "No significant anomalies detected. Sales patterns are consistent."
        else:
            spike_count = sum(1 for a in anomalies if a["type"] == "spike")
            drop_count = sum(1 for a in anomalies if a["type"] == "drop")
            summary = f"Found {len(anomalies)} anomaly(ies): {spike_count} spike(s), {drop_count} drop(s)."

        return AnomalyResponse(anomalies=anomalies, summary=summary)

    @staticmethod
    def business_insights(data: InsightRequest) -> InsightResponse:
        profit_margin = ((data.total_revenue - data.total_cost) / data.total_revenue * 100) if data.total_revenue > 0 else 0
        avg_order_value = (data.total_revenue / data.transaction_count) if data.transaction_count > 0 else 0

        # Health score (0-100)
        score = 50
        if profit_margin > 30:
            score += 20
        elif profit_margin > 15:
            score += 10
        elif profit_margin < 0:
            score -= 20

        if data.transaction_count > 100:
            score += 10
        if data.active_products > 20:
            score += 5
        if data.customer_count > 30:
            score += 5
        if data.credit_sales > data.total_revenue * 0.3:
            score -= 10
        if data.low_stock_count > 5:
            score -= 5

        score = max(0, min(100, score))

        recommendations = []
        if profit_margin < 15:
            recommendations.append("Profit margin is low ({:.1f}%). Consider reviewing pricing or reducing costs.".format(profit_margin))
        if data.low_stock_count > 3:
            recommendations.append(f"{data.low_stock_count} products are low in stock. Restock soon to avoid lost sales.")
        if data.credit_sales > data.total_revenue * 0.3:
            recommendations.append("Credit sales are high ({:.0f}% of revenue). Consider tightening credit policies.".format(
                data.credit_sales / data.total_revenue * 100 if data.total_revenue > 0 else 0))
        if data.customer_count < 10:
            recommendations.append("Customer base is small. Consider loyalty programs to retain and attract customers.")
        if avg_order_value < 5000:
            recommendations.append("Average order value is low ({:,.0f} RWF). Try upselling or bundling products.".format(avg_order_value))
        if not recommendations:
            recommendations.append("Business is performing well. Keep up the good work!")

        return InsightResponse(
            health_score=round(score, 1),
            profit_margin=round(profit_margin, 1),
            avg_order_value=round(avg_order_value, 0),
            recommendations=recommendations,
        )

engine = InsightEngine()

# ============================================
# API ENDPOINTS
# ============================================

@app.get("/health")
async def health():
    return {"status": "ok", "service": "EliteFlow AI Insights"}

@app.post("/api/forecast", response_model=DemandForecastResponse)
async def demand_forecast(request: DemandForecastRequest):
    return engine.forecast_demand(request.sales_history, request.days_ahead)

@app.post("/api/stock-alert", response_model=StockAlertResponse)
async def stock_alert(request: StockAlertRequest):
    return engine.analyze_stock(
        request.product_id,
        request.product_name,
        request.current_stock,
        request.avg_daily_sales,
        request.lead_time_days,
    )

@app.post("/api/anomalies", response_model=AnomalyResponse)
async def detect_anomalies(request: AnomalyRequest):
    return engine.detect_anomalies(request.sales_data)

@app.post("/api/insights", response_model=InsightResponse)
async def business_insights(request: InsightRequest):
    return engine.business_insights(request)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
