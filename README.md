# ResolutionPal 🎯

An AI-powered web application that helps users create meaningful and achievable New Year's resolutions. Using OpenAI's GPT-4, the app guides users through personalized questions to generate detailed, actionable resolution plans.

## ✨ Features

- **Smart Question Flow**: Dynamic, personalized questions that adapt based on user responses
- **AI-Powered Insights**: Leverages OpenAI's GPT-4 for intelligent resolution planning
- **Personalized Action Plans**: Detailed roadmaps with milestones and resources
- **Location-Aware**: Suggests local resources and activities based on user location
- **Interactive UI**: Modern, responsive design with smooth animations
- **Resource Links**: Direct links to tools, communities, and resources

## 🛠 Tech Stack

### Backend
- Python Flask
- OpenAI API (GPT-4)
- Flask-CORS
- Python-dotenv

### Frontend
- HTML5
- Tailwind CSS
- JavaScript
- Font Awesome

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js and npm
- OpenAI API key

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/resolutionpal.git
   cd resolutionpal
   ```

2. **Set Up Environment Variables**
   ```bash
   # Create .env file
   cp .env.example .env
   # Add your OpenAI API key to .env
   OPENAI_API_KEY=your_api_key_here
   ```

3. **Install Dependencies**
   ```bash
   # Install Python dependencies
   pip install -r requirements.txt

   # Install Node dependencies
   npm install
   ```

4. **Build CSS**
   ```bash
   npm run build:css
   ```

5. **Run the Application**
   ```bash
   # Development mode with CSS watching
   npm run dev

   # Or run Flask only
   flask run
   ```

## 💻 Development

### Running in Development Mode
```bash
npm run dev
```
This will start both the Flask server and Tailwind CSS watcher.

### Building for Production
```bash
npm run build
```

## 🌐 API Endpoints

- `GET /`: Landing page
- `GET /start`: Start resolution creation
- `POST /start_session`: Initialize AI session
- `POST /get_next_question`: Get next question
- `POST /generate_resolution`: Generate final resolution

## 🔒 Environment Variables

Required environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `FLASK_ENV`: Development/Production
- `FLASK_RUN_PORT`: Default 5001

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Flask team for the awesome framework
- Tailwind CSS for the styling utilities

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.