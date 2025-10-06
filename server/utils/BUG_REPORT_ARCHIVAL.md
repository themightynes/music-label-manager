# Bug Report Archival System

**Automatic file size management for bug reports**

## 📋 Overview

The bug report archival system automatically moves completed bug reports to monthly archive files when the active file grows too large. This prevents performance issues and keeps the main bug reports file fast and manageable.

## 🔄 How It Works

### Automatic Archival

The system automatically triggers when:
- Active file contains > 50 total reports **AND**
- At least 10 completed reports exist

When triggered:
1. Completed reports are moved to monthly archive files
2. Active file keeps only `new` and `in_review` reports
3. Archives are organized by resolution date: `data/bug-reports-archive/bugReports-YYYY-MM.json`

### File Structure

```
data/
├── bugReports.json                              # Active reports only
└── bug-reports-archive/
    ├── bugReports-2025-10.json                 # October 2025 completed
    ├── bugReports-2025-09.json                 # September 2025 completed
    └── bugReports-2025-08.json                 # August 2025 completed
```

## 🛠️ API Endpoints

### Get Bug Reports (with auto-archival)
```typescript
GET /api/bug-reports?includeArchived=true&status=completed&search=calendar
```

**Query Parameters**:
- `includeArchived` (boolean): Include archived reports in results
- `status` (string): Filter by status (`new`, `in_review`, `completed`)
- `search` (string): Search term for summary, description, or area

**Response**:
```json
{
  "success": true,
  "reports": [...],
  "count": 15,
  "archivalInfo": {
    "archived": 10,
    "remaining": 5,
    "archivedToFiles": ["bugReports-2025-10.json"]
  }
}
```

### Get Statistics
```typescript
GET /api/bug-reports/stats
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "active": {
      "total": 5,
      "new": 2,
      "inReview": 1,
      "completed": 2
    },
    "archived": {
      "totalFiles": 3,
      "totalReports": 45
    }
  }
}
```

### List Archive Files
```typescript
GET /api/bug-reports/archives
```

**Response**:
```json
{
  "success": true,
  "archives": [
    "bugReports-2025-10.json",
    "bugReports-2025-09.json",
    "bugReports-2025-08.json"
  ]
}
```

### Get Archive Contents
```typescript
GET /api/bug-reports/archives/bugReports-2025-10.json
```

**Response**:
```json
{
  "success": true,
  "reports": [...],
  "count": 15,
  "fileName": "bugReports-2025-10.json"
}
```

## 🔧 Configuration

Edit `server/utils/bugReportArchival.ts`:

```typescript
const MAX_ACTIVE_REPORTS = 50;          // Trigger when file exceeds this
const ARCHIVE_THRESHOLD_COMPLETED = 10; // Minimum completed reports to archive
```

## 📊 Performance Benefits

| File Size | Reports | Load Time |
|-----------|---------|-----------|
| < 50 reports | Active only | < 50ms |
| 50-100 reports | Triggers archival | 50-100ms (one-time) |
| 100+ reports | Without archival | 200-500ms ❌ |
| 100+ reports | With archival | < 50ms ✅ |

## 🎯 Usage in Admin Portal

The archival system works automatically. Admins can:

1. **View Active Reports**: Default view shows only active bugs
2. **Search All Reports**: Use `?includeArchived=true` to search archives
3. **View Statistics**: Check `/api/bug-reports/stats` for overview
4. **Browse Archives**: List and view individual archive files

## 🔐 Security

- All endpoints require admin authentication (`requireAdmin` middleware)
- Archive filenames are validated to prevent directory traversal attacks
- Archives are read-only through the API (manual editing via file system)

## 💡 Future Enhancements

Potential improvements:
- Database migration for production scalability
- Automatic archival scheduling (monthly cron job)
- Archive compression for older files
- Archive search optimization with indexing

## 🐛 Troubleshooting

**Issue**: Archival not triggering
- **Check**: File has > 50 total reports AND >= 10 completed reports
- **Solution**: Manually trigger via code or adjust thresholds

**Issue**: Archive file not found
- **Check**: Archive directory exists: `data/bug-reports-archive/`
- **Solution**: Directory auto-creates on first archival

**Issue**: Duplicate reports in archives
- **Check**: Reports are deduplicated by ID during merge
- **Solution**: System handles duplicates automatically
