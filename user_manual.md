# Transcript Search - User Guide

## Overview
This project provides a **full-text search engine** for video and podcast transcripts using **Elasticsearch (Bonsai.io)**, **Vercel**, and a custom UI. It enables users to search for terms in transcripts and jump directly to the relevant timestamp in the associated YouTube video.

## Features
- **Indexing transcripts** into Elasticsearch (Bonsai.io)
- **Fast full-text search** with keyword highlighting
- **Direct timestamped links** to YouTube videos
- **Pagination & Navigation** for results
- **Vercel hosting** for seamless deployment

## Project Structure
```
├── books_source/          # Original unprocessed transcripts
├── public/books/         # Processed transcripts ready for indexing
├── server/               # Backend (Koa.js API for Elasticsearch)
│   ├── app.js            # Main server logic
│   ├── connection.js     # Elasticsearch connection settings
│   ├── search.js         # Query logic for Elasticsearch
│   ├── load_data.js      # Indexing script
├── public/               # Frontend UI files
│   ├── index.html        # Homepage
│   ├── search.html       # Search page
├── vercel.json           # Vercel deployment config
├── package.json          # Dependencies and scripts
├── README.md             # This file
```

---

## **Setup & Deployment**
### 1️⃣ **Preparing Transcripts for Indexing**
Before indexing transcripts into Elasticsearch, they must be **processed** into a clean format where each line represents a searchable paragraph. This is done using the following **command**:

```sh
cat books_source/<file_source> | ./perl/filter.pl > public/books/<output_file>
```

- **Example:**
```sh
cat books_source/Henry-Trading-2025-01-17.txt | ./perl/filter.pl > public/books/Henry-Trading-2025-01-17_clean.txt
```

After processing, **commit and push** the new files to GitHub so that Vercel can deploy the latest version.

```sh
git add public/books/<output_file>
git commit -m "Processed transcript: <output_file>"
git push origin main
```

---

### 2️⃣ **Deploying to Vercel**
The project is automatically deployed via Vercel when changes are pushed to GitHub. To trigger deployment:

1. Make changes locally and push to GitHub.
2. Vercel will detect the updates and redeploy automatically.
3. Monitor the deployment logs on Vercel to verify success.

To manually redeploy, run:
```sh
vercel --prod
```

---

### 3️⃣ **Indexing Data into Elasticsearch**
Once the processed transcripts are uploaded, execute the following command **in a browser or API tool** to **index them into Bonsai Elasticsearch**:

```
GET https://your-vercel-app.vercel.app/load-data
```

**OR** using cURL:
```sh
curl -X GET https://your-vercel-app.vercel.app/load-data
```

This script will:
- **Delete** the existing index.
- **Recreate** the index with correct mappings.
- **Index** all processed transcript files.

Check if indexing was successful by running:
```sh
curl -X GET https://your-vercel-app.vercel.app/health
```

---

### 4️⃣ **Searching for Transcripts**
To perform a search, navigate to the **search page**:
```
https://your-vercel-app.vercel.app/search.html
```

You can also query via API:
```sh
GET https://your-vercel-app.vercel.app/search?term=trading&offset=0
```

Example JSON response:
```json
{
  "total": 120,
  "hits": [
    {
      "title": "Henry Trading 2025",
      "author": "Henry",
      "text": "Example transcript paragraph...",
      "url_youtube": "https://youtube.com/watch?v=example&t=132s",
      "highlight": { "text": ["Example <strong>highlighted</strong> word"] }
    }
  ]
}
```

---

## **Additional Notes**
### ✅ **Troubleshooting**
1. **No new results appearing?**
   - Ensure the processed transcript files are **uploaded to GitHub** and deployed by Vercel.
   - Re-run `load-data` after uploading new files.
   - Check if the index exists using Bonsai’s **Elasticsearch API**:
     ```sh
     curl -X GET https://your-bonsai-cluster.bonsaisearch.net/_cat/indices?v
     ```

2. **Elasticsearch authentication issues?**
   - Ensure your Bonsai.io credentials are correctly set in **Vercel environment variables**:
     ```
     ELASTIC_NODE=your-bonsai-url
     ELASTIC_USERNAME=your-username
     ELASTIC_PASSWORD=your-password
     ```

3. **Vercel deployment failing?**
   - Run `vercel logs` to check for errors.
   - Ensure dependencies are installed: `npm install`

---

## **Contributing**
Feel free to contribute by submitting a **Pull Request**! If you encounter any issues, open a **GitHub Issue**.

---

## **Credits & Original Inspiration**
This project is based on the original **Gutenberg Search** tutorial by Patrick Triest.
- [Original Blog Post](https://blog.patricktriest.com/text-search-docker-elasticsearch/)
- [GitHub Repository](https://github.com/triestpa/guttenberg-search)

We have **extended** this project by:
✅ Integrating **Bonsai.io** for Elasticsearch hosting  
✅ Hosting the app on **Vercel** for easy deployment  
✅ Improving transcript formatting & paragraph indexing  
✅ Enhancing UI/UX for better search results  

Enjoy searching transcripts efficiently! 🚀

