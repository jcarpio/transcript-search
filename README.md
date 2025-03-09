# Transcript Search: Full-Text Search for Video and Podcast Transcriptions

## Introduction

This project is a full-text search engine designed to index and search transcriptions of videos and podcasts. It builds upon the original concept of a literary search engine and has been adapted to work with real-world spoken content.

### Features:
- 🔍 **Full-text search** across video and podcast transcriptions.
- 🎥 **Direct timestamp links** to YouTube videos.
- 📚 **Pagination support** for efficient browsing.
- 🚀 **Deployed on Vercel** for a fast, serverless experience.
- 🔎 **Powered by Bonsai Elasticsearch** for scalable search capabilities.

## Deployment & Configuration

### 1️⃣ Hosting on Vercel

The frontend and backend are deployed using [Vercel](https://vercel.com/), which provides an easy-to-use serverless architecture.

#### Steps to Deploy:
1. **Clone the repository**
   ```sh
   git clone https://github.com/YOUR_GITHUB_USERNAME/transcript-search.git
   cd transcript-search
   ```
2. **Install dependencies**
   ```sh
   npm install
   ```
3. **Set up environment variables** (Create a `.env` file in the root directory)
   ```
   ELASTIC_NODE=https://user:password@your-bonsai-elasticsearch-url

   ```
4. **Deploy to Vercel**
   ```sh
   vercel
   ```

### 2️⃣ Configuring Bonsai Elasticsearch

We use [Bonsai Elasticsearch](https://bonsai.io/) as the search backend. This required adapting the Elasticsearch client to be compatible with version 7.x.

#### Creating the Index
To manually create the index, use:
```sh
curl -X PUT "https://your-bonsai-url/library" -H "Content-Type: application/json" -d '{
  "settings": { "number_of_shards": 1 },
  "mappings": { "properties": { "title": { "type": "keyword" }, "author": { "type": "keyword" }, "url_original": { "type": "keyword" }, "url_youtube": { "type": "keyword" }, "url_ivoox": { "type": "keyword" }, "location": { "type": "integer" }, "text": { "type": "text" } } }
}'
```

### 3️⃣ Loading Transcriptions into Elasticsearch
Transcriptions are stored in text files and indexed as paragraphs. To load data into Elasticsearch, we implemented an API endpoint:
```sh
GET /load-data
```
This script reads the text files, processes them into searchable chunks, and indexes them into Elasticsearch.

### 4️⃣ Performing a Search
The search endpoint is structured as follows:
```sh
GET /search?term=trading&offset=0
```
This will return a JSON response with:
- The total number of matching results.
- Up to 9 results per page (configurable).
- Highlighted keywords in the transcriptions.
- Direct YouTube links with timestamps.

### 5️⃣ Search UI (Frontend)
The frontend (`public/search.html`) is built with vanilla JavaScript and makes requests to the backend via Fetch API. The UI dynamically displays:
- **Total results found**
- **Pagination controls**
- **Clickable links to video timestamps**

## Future Improvements
- ✅ Support for multiple search operators (e.g., exact match, fuzzy search, Boolean queries).
- ✅ Automatic transcript processing and indexing from YouTube API.
- ✅ Mobile-friendly responsive design.

## Credits
This project was adapted from the original Elasticsearch tutorial by [Patrick Triest](https://blog.patricktriest.com/text-search-docker-elasticsearch/) and extended to work with video and podcast transcriptions.

___

This application is 100% open-source, feel free to utilize the code however you would like.

```
The MIT License (MIT)

Copyright (c) 2018 Patrick Triest

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
