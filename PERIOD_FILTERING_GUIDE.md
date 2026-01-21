# Period-Based Filtering Guide

## Overview
The GitHub Activity Tracker supports **dynamic period-based filtering** for student commit scores, activity metrics, and data exports. This means that all displayed data (commits, PRs, scores, etc.) automatically adjusts based on the selected time period.

## Supported Time Periods

### 1. **Today**
- Shows activity from the current day only
- Cutoff: Current date (YYYY-MM-DD)

### 2. **Weekly**
- Shows activity from the last 7 days
- Cutoff: Current date - 7 days

### 3. **Monthly**
- Shows activity from the last 30 days
- Cutoff: Current date - 30 days
- **Default period** when page loads

### 4. **All**
- Shows all historical activity
- Cutoff: 2000-01-01 (effectively no limit)

### 5. **Custom**
- Allows you to select a specific date range
- Requires both **From** and **To** dates
- Most flexible option for specific reporting needs

## How It Works

### Frontend (Students Registry Page)
Located in: `frontend/src/components/StudentsPage.jsx`

```javascript
// Period selection buttons
['today', 'weekly', 'monthly', 'all', 'custom'].map(p => (
    <button onClick={() => setPeriod(p)}>
        {p}
    </button>
))

// API call with period parameter
let url = `${API_BASE}/students/?period=${period}&limit=100`;
if (period === 'custom' && startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`;
}
```

### Backend (Students Router)
Located in: `backend/routers/students.py`

The backend endpoint `/students/` accepts these query parameters:
- `period`: One of [today, weekly, monthly, all, custom]
- `start_date`: Required when period=custom (format: YYYY-MM-DD)
- `end_date`: Required when period=custom (format: YYYY-MM-DD)

```python
@router.get("/", response_model=List[StudentRead])
def read_students(
    period: str = "monthly", 
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Handle custom date range
    if period == "custom" and start_date and end_date:
        cutoff_start = start_date
        cutoff_end = end_date
    else:
        cutoff_start = get_period_cutoff(period)
        cutoff_end = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Query activity logs within date range
    logs_summary = db.query(
        func.sum(ActivityLog.commits_count).label("commits"),
        func.sum(ActivityLog.pr_count).label("prs"),
        # ... other metrics
    ).filter(
        ActivityLog.student_id == s.id, 
        ActivityLog.date_str >= cutoff_start,
        ActivityLog.date_str <= cutoff_end
    ).first()
```

### Score Calculation
The activity score is calculated dynamically based on the filtered period:

```python
activity_score = (commits * 2) + (prs * 3) + (active_days * 1)
```

Where:
- **commits**: Total commits in the selected period
- **prs**: Total pull requests in the selected period
- **active_days**: Number of days with activity in the selected period

## Data Export
Located in: `backend/routers/analytics.py`

The export functionality (`/analytics/export/csv`) uses the **same filtering logic** to ensure exported data matches what's displayed on screen.

```python
@router.get("/analytics/export/csv")
def export_full_history(
    period: str = "all",
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db)
):
    # Same filtering logic as student list
    if period == "custom" and start_date and end_date:
        cutoff_start = start_date
        cutoff_end = end_date
    else:
        cutoff_start = get_period_cutoff(period)
        cutoff_end = datetime.utcnow().strftime("%Y-%m-%d")
```

## Activity Log Storage
All GitHub activity is stored in the `activity_logs` table with daily granularity:

```python
class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    date_str = Column(String, index=True)  # YYYY-MM-DD format
    
    commits_count = Column(Integer, default=0)
    pr_count = Column(Integer, default=0)
    issue_count = Column(Integer, default=0)
    review_count = Column(Integer, default=0)
```

This design allows for:
- ✅ Efficient date-range queries
- ✅ Historical data preservation
- ✅ Flexible period filtering
- ✅ Accurate trend analysis

## User Interface Flow

1. **User selects a period** (e.g., "Weekly")
2. **Frontend updates URL** with `?period=weekly`
3. **API request is made** with the period parameter
4. **Backend calculates cutoff date** (7 days ago)
5. **Database query filters** activity logs by date range
6. **Scores are calculated** based on filtered data
7. **Results are returned** and displayed

## Custom Date Range Example

**Scenario**: You want to see activity from January 1, 2026 to January 20, 2026

1. Click **"Custom"** button
2. Set **From**: `2026-01-01`
3. Set **To**: `2026-01-20`
4. Data automatically refreshes

**API Call**:
```
GET /students/?period=custom&start_date=2026-01-01&end_date=2026-01-20
```

**Export**:
```
GET /analytics/export/csv?period=custom&start_date=2026-01-01&end_date=2026-01-20
```

## Important Notes

⚠️ **Consistency**: The same filtering logic is used across:
- Student Registry page
- Dashboard leaderboards
- Data exports
- Analytics reports

⚠️ **Real-time Updates**: When you click "Sync All" or refresh a student, new activity data is fetched from GitHub and stored in daily activity logs, which immediately affects all period-based calculations.

⚠️ **Ranking**: Students are ranked by activity score within the selected period, so rankings can change when you switch periods.

## Troubleshooting

**Q: Scores don't change when I select a different period**
- Check browser console for API errors
- Ensure backend is running on port 8000
- Verify activity logs exist in the database

**Q: Custom date range doesn't work**
- Ensure both From and To dates are selected
- Dates must be in YYYY-MM-DD format
- End date must be >= start date

**Q: Export shows different data than the screen**
- Both should use the same period parameter
- Check that the export URL includes the correct period/dates
- Verify the export button is passing the right parameters

## Summary

✅ **Period filtering is fully implemented** and working across the entire application
✅ **All metrics dynamically adjust** based on the selected time period
✅ **Custom date ranges are supported** for flexible reporting
✅ **Data consistency** is maintained between UI and exports
