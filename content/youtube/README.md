# VORA Content - YouTube JSON Files

## Overview
These JSON files power the VORA (Video Online Resource Archive) learning system in the BDJA Platform. Each file corresponds to a grade level and contains an array of educational video objects.

## File Structure
- `playgroup.json` - Playgroup content
- `pp1.json` - Pre-Primary 1 content
- `pp2.json` - Pre-Primary 2 content
- `grade1.json` through `grade6.json` - Primary grade content

## JSON Schema
Each video object must include these fields:

```json
{
  "id": "unique-identifier-001",
  "title": "Video Title Here",
  "subject": "Mathematics",
  "category": "Number Work",
  "topic": "Counting 1-20",
  "youtube_url": "https://youtube.com/watch?v=VIDEO_ID",
  "summary": "Brief description of what the video teaches (1-3 sentences).",
  "tags": ["counting", "numbers", "early math"],
  "duration_seconds": 300,
  "difficulty": "beginner",
  "thumbnail_url": "https://img.youtube.com/vi/VIDEO_ID/mqdefault.jpg",
  "channel": "Channel Name"
}
```

### Field Descriptions
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (use kebab-case) |
| `title` | string | Yes | Video title shown to students |
| `subject` | string | Yes | Subject name (e.g., "Mathematics", "English", "Science") |
| `category` | string | Yes | Sub-category within subject (e.g., "Number Work", "Reading") |
| `topic` | string | Yes | Specific topic covered |
| `youtube_url` | string | Yes | Full YouTube watch URL |
| `summary` | string | Yes | 1-3 sentence description |
| `tags` | string[] | Yes | Searchable keywords |
| `duration_seconds` | number | No | Video length in seconds |
| `difficulty` | string | No | `"beginner"`, `"intermediate"`, or `"advanced"` |
| `thumbnail_url` | string | No | YouTube thumbnail URL |
| `channel` | string | No | YouTube channel name |

## How to Add Content
1. Find an educational YouTube video appropriate for the grade
2. Extract the video ID from the URL (the part after `v=`)
3. Generate the thumbnail URL: `https://img.youtube.com/vi/VIDEO_ID/mqdefault.jpg`
4. Create a JSON object following the schema above
5. Append it to the appropriate grade JSON file
6. Restart the Next.js dev server or redeploy to see changes

## Tips
- Use consistent subject names across all grades (e.g., always "Mathematics" not "Maths")
- Keep summaries concise but informative for search ranking
- Include relevant tags to improve Joy AI search results
- Videos are read at build time and cached; changes require a restart
