# HalalWise

HalalWise is an AI-powered Islamic finance and learning platform designed to provide simple, source-grounded explanations about Islam and help users explore halal investing concepts.

## Features

- AI Islamic Assistant
  - Ask questions about Islam in simple language
  - Retrieval-augmented generation (RAG) using a curated knowledge base
  - Source-grounded responses with citations
  - Safety-aware handling of personal religious rulings

- Islamic Learning
  - Structured lessons and categories
  - Quran and Hadith-based learning resources
  - Learning progress tracking
  - Search, bookmarks, and saved content

- Halal Investment Screening
  - Explore companies and financial information
  - Shariah-oriented financial screening
  - Finance data verification workflows
  - Company watchlist functionality

- Quran & Hadith
  - Quran verses and translations
  - Hadith resources with verification metadata
  - Saved Quran and Hadith content

- User Accounts
  - Authentication
  - User profiles
  - Question history
  - Bookmarks and learning progress

## AI & Retrieval

HalalWise uses a retrieval-augmented generation architecture to ground AI responses in curated Islamic knowledge rather than relying only on the model's general knowledge.

The retrieval pipeline includes:

- Semantic embeddings
- MongoDB vector search
- Topic-based retrieval fallback
- Source verification metadata
- Citation-aware answer generation
- Retrieval confidence thresholds

The project uses the `Xenova/all-MiniLM-L6-v2` model for local text embeddings.

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Next.js App Router
- Next.js API Routes
- Node.js
- NextAuth

### Database

- MongoDB Atlas
- MongoDB Vector Search

### AI / NLP

- Retrieval-Augmented Generation (RAG)
- Semantic embeddings
- `Xenova/all-MiniLM-L6-v2`

### Data & Processing

- TypeScript
- Financial data ingestion pipelines
- Quran and Hadith ingestion and verification scripts

## Project Structure

```text
halalwise/
|-- app/            # Pages and API routes
|-- components/     # Reusable UI components
|-- lib/            # Database, authentication and application logic
|-- public/         # Static assets
|-- scripts/        # Data ingestion, verification and finance pipelines
|-- types/          # TypeScript type definitions
|-- auth.ts         # Authentication configuration
`-- package.json    # Project dependencies and scripts