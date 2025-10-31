# CMG Training Builder

AI-powered training documentation generator for CMG Financial. Upload documents, specifications, or transcripts, and automatically generate professional training materials.

🌐 **Live Application**: [https://trainbuilder.cmgfinancial.ai](https://trainbuilder.cmgfinancial.ai)

## 🚀 Features

- **Drag & Drop File Upload** - Upload PDFs, Word docs, text files, and more
- **AI-Powered Generation** - Creates professional training documentation using OpenAI GPT-4
- **Multiple Output Types**:
  - Release Notes
  - Training Guides
  - Email Announcements
  - Quick Reference Cards
  - FAQ Documents
  - User Manuals
- **Multi-Format Export** - Download as Markdown, HTML, or plain text
- **ZIP Download** - Bundle all documents in a single ZIP file
- **Professional CMG Branding** - Consistent with CMG Financial design standards

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **AI**: OpenAI GPT-4 Turbo
- **Libraries**:
  - JSZip (file bundling)
  - file-saver (downloads)
  - OpenAI SDK
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## 🏃 Getting Started

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/mhansen003/cmg-training-builder.git
cd cmg-training-builder
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Set up environment variables

Create a \`.env\` file in the root directory:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit \`.env\` and add your OpenAI API key:

\`\`\`
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
\`\`\`

### 4. Run the development server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:5173](http://localhost:5173) in your browser.

**Production URL**: [https://trainbuilder.cmgfinancial.ai](https://trainbuilder.cmgfinancial.ai)

## 🏗️ Building for Production

\`\`\`bash
npm run build
\`\`\`

The built files will be in the \`dist\` folder.

## 🚢 Deploying to Vercel

### Option 1: Deploy via Vercel CLI

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
\`\`\`

### Option 2: Deploy via GitHub

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variable: \`VITE_OPENAI_API_KEY\`
4. Deploy!

**Important**: Add your OpenAI API key to Vercel environment variables:
- Go to your project settings in Vercel
- Navigate to "Environment Variables"
- Add \`VITE_OPENAI_API_KEY\` with your OpenAI API key

## 📁 Project Structure

\`\`\`
cmg-training-builder/
├── src/
│   ├── components/       # React components (future)
│   ├── config/          # Configuration files
│   │   └── documentOptions.ts
│   ├── services/        # API services
│   │   └── openai.ts
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   ├── fileProcessor.ts
│   │   └── zipGenerator.ts
│   ├── App.tsx          # Main application component
│   ├── App.css          # Application styles
│   └── main.tsx         # Entry point
├── .env.example         # Environment variables template
├── package.json         # Dependencies
├── vite.config.ts       # Vite configuration
└── README.md           # This file
\`\`\`

## 🎨 Customization

### Adding New Document Types

Edit \`src/config/documentOptions.ts\` and add a new option:

\`\`\`typescript
{
  id: 'custom-doc',
  label: 'Custom Document',
  description: 'Your custom document description',
  prompt: 'Prompt for OpenAI',
}
\`\`\`

Update the system prompt in \`src/services/openai.ts\` for specialized instructions.

### Changing AI Model

Edit \`src/services/openai.ts\` and change the model:

\`\`\`typescript
model: 'gpt-4-turbo-preview', // or 'gpt-4', 'gpt-3.5-turbo', etc.
\`\`\`

## 📝 Usage

1. **Upload Files**: Drag and drop or click to browse
2. **Select Outputs**: Choose which document types to generate
3. **Generate**: Click "Generate Training Documents with AI"
4. **Download**: Download individual docs or all as ZIP

## 🔒 Security Notes

- The OpenAI API key is exposed in the browser (required for client-side calls)
- For production, consider implementing rate limiting
- Or use Vercel Serverless Functions for enhanced security

## 📄 License

© 2025 CMG Financial. All rights reserved.

## 🤝 Contributing

This is an internal CMG Financial project. Contact the IT team for contribution guidelines.

## 📞 Support

Need help? Contact CMG IT Support at 949-523-3372
