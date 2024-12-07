from flask import Flask, render_template, request, jsonify, send_from_directory
from openai import OpenAI
import os
import json
from dotenv import load_dotenv
from flask_cors import CORS
import re
import traceback
from datetime import datetime
import time
import markdown

# Load environment variables
load_dotenv()

# Get API key with error handling
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("OpenAI API key not found in .env file")

# Configure OpenAI
client = OpenAI(api_key=api_key)

# Initialize Flask app
app = Flask(__name__)
CORS(app)
app.static_folder = os.path.abspath('static')
app.static_url_path = '/static'

# Store assistant IDs
question_assistant_id = None
resolution_assistant_id = None

def create_question_assistant():
    """Create or retrieve the question assistant"""
    global question_assistant_id
    
    # Try to reuse existing assistant
    if question_assistant_id:
        try:
            return client.beta.assistants.retrieve(question_assistant_id)
        except:
            question_assistant_id = None
    
    # Look for existing assistant
    assistants = client.beta.assistants.list()
    for assistant in assistants.data:
        if assistant.name == "Question Assistant":
            print("Found existing question assistant")
            question_assistant_id = assistant.id
            return assistant
            
    print("Creating new question assistant")
    assistant = client.beta.assistants.create(
        name="Question Assistant",
        instructions="""You are an expert resolution coach that asks questions to help users create meaningful and achievable New Year's resolutions. Your role is to gather specific, actionable information through a series of targeted questions.

        QUESTION TYPES TO USE:
        1. [YES/NO] - For clear binary choices
           Example: "Have you tried setting similar goals before?"
           Example: "Would you prefer working with a mentor?"

        2. [CHOICE] - For gathering specific preferences (ALWAYS provide 4-6 relevant options plus "Other")
           Format: Question text (Option 1, Option 2, Option 3, Option 4, Other)
           Example: "How would you like to track your progress? (Mobile App, Written Journal, Calendar, Spreadsheet, Other)"
           Example: "When do you have the most free time? (Early Morning, Lunch Break, Evening, Weekends, Other)"

        3. [TEXT] - For brief, specific details (use sparingly)
           Example: "What's your biggest obstacle to achieving this goal?"
           Example: "Name one person who could help you with this goal."

        ABSOLUTELY FORBIDDEN QUESTIONS:
        ❌ ANY questions about confidence levels
        ❌ ANY questions using numerical scales (1-10, 1-5, etc.)
        ❌ ANY questions about motivation levels
        ❌ ANY questions asking "how much" or "how many"
        ❌ ANY questions using percentages
        ❌ ANY questions about measuring feelings or emotions
        ❌ ANY questions specifically about location or environment

        REQUIRED REPLACEMENTS FOR COMMON QUESTIONS:
        Instead of asking about confidence:
        ❌ BAD: "How confident are you about achieving this? (1-10)"
        ✓ GOOD: "[CHOICE] What best describes your readiness? (Ready to Start, Need More Planning, Want a Mentor, Have Some Concerns, Other)"

        Instead of asking about motivation:
        ❌ BAD: "How motivated are you? (1-10)"
        ✓ GOOD: "[CHOICE] What drives you toward this goal? (Personal Growth, Career Impact, Family Support, Health Benefits, Other)"

        Instead of asking about difficulty:
        ❌ BAD: "How challenging does this feel? (1-10)"
        ✓ GOOD: "[CHOICE] What's your biggest concern? (Time Management, Learning Curve, Resources Needed, External Support, Other)"

        Instead of asking about time commitment:
        ❌ BAD: "How many hours can you commit? (1-10)"
        ✓ GOOD: "[CHOICE] When can you work on this? (Daily Short Sessions, Weekly Deep Focus, Weekends Only, Flexible Schedule, Other)"

        QUESTION SEQUENCE:
        1. Start with [YES/NO] questions to establish baseline experience
        2. Use [CHOICE] questions to understand preferences and habits
        3. Use [TEXT] questions sparingly for specific details
        4. Always build on previous answers
        5. Focus on gathering actionable information

        IMPORTANT RULES:
        1. Keep questions under 15 words
        2. Never repeat questions
        3. Always provide specific options for [CHOICE] questions
        4. Include "Other" as the final option in [CHOICE] questions
        5. Focus on practical, actionable information
        6. Build context from previous answers

        FINAL CHECK:
        Before sending each question, verify:
        1. It does NOT ask for any numerical rating
        2. It does NOT ask about confidence levels
        3. It does NOT ask about motivation levels
        4. It DOES provide specific options for [CHOICE] questions
        5. It IS focused on gathering actionable information
        6. It does NOT ask about location specifics

        Remember: Your questions should help gather specific, actionable information to create meaningful resolutions. Never use numerical scales or ratings - they don't provide meaningful insights for resolution planning.""",
        model="gpt-4o-mini"
    )
    question_assistant_id = assistant.id
    return assistant

def create_resolution_assistant():
    """Create or retrieve the resolution assistant"""
    global resolution_assistant_id
    
    # Try to reuse existing assistant
    if resolution_assistant_id:
        try:
            return client.beta.assistants.retrieve(resolution_assistant_id)
        except:
            resolution_assistant_id = None
    
    # Look for existing assistant
    assistants = client.beta.assistants.list()
    for assistant in assistants.data:
        if assistant.name == "Resolution Assistant":
            print("Found existing resolution assistant")
            resolution_assistant_id = assistant.id
            return assistant
            
    print("Creating new resolution assistant")
    assistant = client.beta.assistants.create(
        name="Resolution Assistant",
        instructions="""You are an expert resolution coach that creates highly personalized New Year's resolutions.
        Your role is to analyze the user's responses and create a detailed, actionable plan that reflects their
        specific situation, preferences, and goals.

        ANALYSIS APPROACH:
        1. Review all user responses carefully
        2. Note specific details about their:
           - Current situation and habits
           - Preferences and style
           - Support system and resources
           - Challenges and concerns
           - Experience level
           - Time availability
           - Location and environment

        LOCATION UTILIZATION (Use location data from initial questions, DO NOT ask for more):
        1. Urban Locations:
           - Reference specific local gyms, studios, or fitness centers with links
           - Mention nearby parks, trails, or recreational areas with maps
           - Suggest local classes, workshops, or community programs with registration links
           - Include location-specific events and meetups with links
           - Reference public transportation options with relevant links

        2. Suburban Locations:
           - Incorporate home-based and neighborhood activities
           - Mention local community centers and facilities with links
           - Suggest ways to connect with neighbors (NextDoor, local Facebook groups)
           - Include both indoor and outdoor options
           - Reference local clubs and groups with joining information

        3. Rural Locations:
           - Focus on home-based and outdoor activities
           - Suggest ways to leverage natural surroundings
           - Include online and remote options with links
           - Mention regional events and gatherings with links
           - Reference local community resources with contact info

        RESOLUTION CREATION RULES:
        1. Be highly specific - avoid generic advice
        2. Reference their actual responses
        3. Use their name and location naturally
        4. Build on their existing habits
        5. Address their stated challenges
        6. Incorporate their preferences
        7. Match their experience level
        8. Consider their time availability
        9. Reference local opportunities with links
        10. Suggest specific tools they mentioned

        FORMATTING AND LINKING:
        1. Use HTML tags for formatting:
           - <h1> for main section headings
           - <h2> for subsection headings
           - Bullet points with -
           - <b>text</b> for emphasis
           - <a href="URL">link text</a> for hyperlinks
           - Always close all HTML tags properly

        2. Required Link Types:
           - Equipment/Products: Link to quality options on Amazon or specialized retailers
           - Local Resources: Link to official websites, Google Maps, or social media
           - Online Communities: Link to relevant groups, forums, or platforms
           - Learning Resources: Link to courses, tutorials, or educational content
           - Apps/Tools: Link to app stores or official websites
           - Events: Link to registration or information pages

        3. Structure:
           - Keep paragraphs short and scannable
           - Use bullet points for lists
           - Include specific dates and numbers
           - Break long-term goals into phases
           - Embed relevant links naturally within text

        LINK PLACEMENT RULES:
        1. Resources Section:
           - Every recommended tool or resource should have a link
           - Group similar resources together
           - Include both free and paid options when relevant
           - Provide alternatives when possible

        2. Action Plan:
           - Link to specific tools or resources mentioned
           - Include links to local venues or facilities
           - Reference online communities or groups
           - Link to relevant tutorials or guides

        3. Support System:
           - Link to local community groups
           - Include relevant online forums
           - Reference professional services with links
           - Add links to networking platforms

        Remember: Every resolution should feel personally crafted for this specific user,
        incorporating their unique context and preferences. Make all resources easily
        accessible through relevant, working links.""",
        model="gpt-4o-mini"
    )
    resolution_assistant_id = assistant.id
    return assistant

# Create or retrieve the assistants at startup
question_assistant = create_question_assistant()
resolution_assistant = create_resolution_assistant()
print(f"Question Assistant ID: {question_assistant.id}")
print(f"Resolution Assistant ID: {resolution_assistant.id}")

@app.route('/')
def landing():
    """Render the landing page"""
    return render_template('landing.html', landing_page=True)

@app.route('/start')
def index():
    """Start the resolution creation process"""
    return render_template('index.html', landing_page=False)

@app.route('/start_session', methods=['POST'])
def start_session():
    try:
        print("\nStarting new session...")
        data = request.json
        name = data.get('name', 'User')
        location = data.get('location', '')
        resolution_type = data.get('resolutionType', '')
        specific_resolution = data.get('specificResolution', '')
        
        print(f"Creating thread for user: {name}")
        print(f"Location: {location}")
        print(f"Resolution Type: {resolution_type}")
        print(f"Specific Resolution: {specific_resolution}")
        
        thread = client.beta.threads.create()
        print(f"Thread created with ID: {thread.id}")
        
        # Format initial message without indentation
        initial_message = (
            f"Hi, I'm {name} from {location}. I'd like help creating New Year's resolutions. "
            f"I'm specifically interested in {resolution_type}. "
            f"My specific resolution idea is: {specific_resolution}"
        ).strip()
        
        print("Adding initial message...")
        print(f"Initial message: {initial_message}")
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=initial_message
        )
        print("Initial message added")
        
        # Format instructions without indentation
        instructions = (
            f"Ask the first question to understand {name}'s goals. "
            f"They are interested in {resolution_type} resolutions, specifically: {specific_resolution}. "
            "Remember to:\n"
            "1. Keep your question under 15 words\n"
            "2. Start with a type indicator [YES/NO], [CHOICE], or [TEXT]\n"
            "3. Make it specific to their resolution focus\n"
            "4. Don't ask about general interests - we already know their focus\n"
            "5. Never use numerical scales or ratings\n"
            "6. For preferences, always use [CHOICE] with specific options"
        ).strip()
        
        print("Creating run for first question...")
        print(f"Instructions: {instructions}")
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=question_assistant.id,
            instructions=instructions
        )
        print(f"Run created with ID: {run.id}")
        
        run = wait_for_run(thread.id, run.id)
        
        messages = client.beta.threads.messages.list(thread_id=thread.id)
        first_question = messages.data[0].content[0].text.value
        
        # Validate the question format
        if not first_question.startswith('['):
            print("Warning: First question doesn't start with type indicator")
            # Try to infer the type and add it
            if "yes or no" in first_question.lower() or first_question.lower().startswith("do you"):
                first_question = "[YES/NO] " + first_question
            elif "choose" in first_question.lower() or "select" in first_question.lower() or "prefer" in first_question.lower():
                first_question = "[CHOICE] " + first_question
            else:
                first_question = "[TEXT] " + first_question
        
        # Check question length
        words = first_question.split()
        if len(words) > 20:  # Allowing a bit more than 15 to account for the type indicator
            print("Warning: First question too long, truncating...")
            first_question = ' '.join(words[:20])
        
        return jsonify({
            "question": first_question,
            "threadId": thread.id,
            "questionNumber": 1
        })
        
    except Exception as e:
        print(f"Error in start_session: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

def wait_for_run(thread_id, run_id, max_wait_time=30):
    """Helper function to wait for a run to complete and handle required actions"""
    start_time = time.time()
    
    while True:
        if time.time() - start_time > max_wait_time:
            raise TimeoutError("Assistant response took too long")
            
        run = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run_id)
        print(f"Run status: {run.status}")
        
        if run.status == 'completed':
            return run
        elif run.status == 'requires_action':
            print("Run requires action - submitting empty tool outputs")
            client.beta.threads.runs.submit_tool_outputs(
                thread_id=thread_id,
                run_id=run_id,
                tool_outputs=[]
            )
        elif run.status == 'failed':
            error = run.last_error
            raise Exception(f"Run failed: {error.code} - {error.message}")
        elif run.status in ['cancelled', 'expired']:
            raise Exception(f"Run failed with status: {run.status}")
            
        time.sleep(1)

@app.route('/get_next_question', methods=['POST'])
def get_next_question():
    try:
        print("\n=== Getting Next Question ===")
        data = request.json
        thread_id = data.get('threadId')
        answer = data.get('answer')
        question_number = data.get('questionNumber', 0)
        
        print(f"Thread ID: {thread_id}")
        print(f"Previous answer: {answer}")
        print(f"Question number: {question_number}")
        
        if not thread_id:
            raise ValueError("Thread ID is required")
            
        # Add the user's answer to the thread
        print("Adding user's answer to thread...")
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=str(answer)
        )
        print("Answer added to thread")
        
        # If we've reached 10 questions, generate the resolution
        if question_number >= 9:  # 0-based index, so 9 means we've done 10 questions
            print("Reached final question, generating resolution...")
            return generate_resolution(thread_id)
            
        # Get the next question
        print("Creating run for next question...")
        run = client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=question_assistant.id,
            instructions=f"""Ask question #{question_number + 1}. 
            Remember to:
            1. Keep it under 15 words
            2. Start with the appropriate type indicator [YES/NO], [CHOICE], or [TEXT]
            3. Make it specific to their previous answers
            4. Never repeat a previous question
            5. Vary the question type from the last question"""
        )
        print(f"Run created with ID: {run.id}")
        
        run = wait_for_run(thread_id, run.id)
        
        # Get the assistant's response
        print("Retrieving assistant's response...")
        messages = client.beta.threads.messages.list(thread_id=thread_id)
        last_message = messages.data[0].content[0].text.value
        print(f"Next question: {last_message}")
        
        # Validate the question format
        if not last_message.startswith('['):
            print("Warning: Question doesn't start with type indicator")
            # Try to infer the type and add it
            if "yes or no" in last_message.lower() or last_message.lower().startswith("do you"):
                last_message = "[YES/NO] " + last_message
            elif "choose" in last_message.lower() or "select" in last_message.lower() or "prefer" in last_message.lower():
                last_message = "[CHOICE] " + last_message
            else:
                last_message = "[TEXT] " + last_message
        
        # Check question length
        words = last_message.split()
        if len(words) > 20:  # Allowing a bit more than 15 to account for the type indicator
            print("Warning: Question too long, truncating...")
            last_message = ' '.join(words[:20])
        
        return jsonify({
            "question": last_message,
            "threadId": thread_id,
            "questionNumber": question_number + 1
        })
        
    except TimeoutError as e:
        print(f"Timeout error: {str(e)}")
        return jsonify({"error": "Request timed out. Please try again."}), 504
    except Exception as e:
        print(f"Error in get_next_question: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

def generate_resolution(thread_id):
    """Generate the final resolution using the resolution assistant"""
    try:
        print("\n=== Generating Resolution ===")
        
        # Get the conversation history first
        messages = client.beta.threads.messages.list(thread_id=thread_id)
        conversation_history = [
            {
                "role": msg.role,
                "content": msg.content[0].text.value
            } for msg in messages.data
        ]
        
        print("Conversation history:", conversation_history)
        
        # Create a run with the resolution assistant
        print("Creating resolution run...")
        instructions = f"""Based on the conversation history, create a personalized resolution plan.
        
        IMPORTANT CONTEXT:
        The user has provided detailed information about their goals, preferences, and current situation.
        Pay special attention to their specific answers about routines, preferences, and challenges.
        Use all of this context to create a highly personalized plan.

        REQUIRED SECTIONS:
        1. Title - Make it personal and specific to their goal
        2. Vision - 2-3 sentences describing their ideal end state
        3. Key Goals - 3-5 specific, measurable sub-goals
        4. Personal Motivation - Connect to their specific reasons and situation
        5. Action Plan - Break down by time periods, with relevant links:
           - January (Getting Started) - Include links to initial resources
           - February-March (Building Habits) - Link to tools and communities
           - April-June (Growing Stronger) - Add progressive resource links
           - July-September (Maintaining Momentum) - Include support group links
           - October-December (Achieving Milestones) - Link to advanced resources
        6. Milestones - 4-5 specific checkpoints with dates:
           Example: <b>January 15</b>: Set up <a href="URL">recommended tool</a>
        7. Resources & Tools - Include links to all recommended resources
        8. Support System - Link to relevant communities and groups
        9. Encouragement - One sentence of personalized motivation

        HTML FORMATTING REQUIREMENTS:
        1. Use proper heading tags:
           <h1>Main Title</h1>
           <h2>Section Headings</h2>
           <h3>Subsection Headings</h3>

        2. Use proper formatting tags:
           - Bold: <b>important text</b>
           - Links: <a href="URL">descriptive text</a>
           - Combine when needed: <b><a href="URL">important link</a></b>
           Example: "Start with <b>daily practice</b> using <a href="URL">this beginner guide</a>"

        3. Lists and Structure:
           - Use bullet points with single dash (-)
           - Keep paragraphs short and focused
           - Use bold tags for emphasis within paragraphs
           - Include specific dates and metrics
           - Format milestone dates with <b>Date</b>: Description
        
        PERSONALIZATION RULES:
        1. Reference specific details they mentioned
        2. Use their name and location naturally
        3. Incorporate their stated preferences
        4. Address their specific challenges
        5. Build on their existing habits
        6. Reference their support system
        7. Match their experience level
        8. Include location-specific suggestions where relevant
        9. Consider seasonal factors if applicable
        10. Balance general and local resources
        
        Add relevant links throughout content

        LINK REQUIREMENTS:
        1. Every recommended resource must have a working link
        2. Include links for:
           - Tools and apps
           - Local facilities
           - Online communities
           - Learning resources
           - Equipment or supplies
           - Support groups
           - Professional services
        3. Use descriptive link text
        4. Embed links naturally in content
        
        Make every section highly specific to their situation - avoid generic advice.
        Use location data to enhance the plan naturally, without making it the main focus.
        
        IMPORTANT FORMATTING REMINDERS:
        - Always use HTML tags properly
        - Close all tags correctly
        - Include relevant, working links
        - Use descriptive link text
        - Format dates with <b>Date</b>: Description"""
        
        run = client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=resolution_assistant.id,
            instructions=instructions
        )
        
        print(f"Created run with ID: {run.id}")
        
        # Wait for completion with timeout
        run = wait_for_run(thread_id, run.id, max_wait_time=60)
        print(f"Run completed with status: {run.status}")
        
        # Get the resolution
        messages = client.beta.threads.messages.list(thread_id=thread_id)
        if not messages.data:
            raise ValueError("No messages received from assistant")
            
        resolution = messages.data[0].content[0].text.value
        print("Generated resolution:", resolution[:100] + "...")
        
        return jsonify({
            "resolution": resolution,
            "threadId": thread_id,
            "isComplete": True
        })
        
    except Exception as e:
        print(f"Error generating resolution: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({
            "error": str(e),
            "resolution": None,
            "threadId": thread_id
        }), 500

@app.route('/generate-resolution', methods=['POST'])
def handle_generate_resolution():
    try:
        data = request.get_json()
        thread_id = data.get('threadId')
        
        if not thread_id:
            return jsonify({"error": "No thread ID provided"}), 400
            
        response = generate_resolution(thread_id)
        
        # Process the markdown to ensure proper rendering
        if isinstance(response, tuple):
            return response
            
        resolution_data = response.get_json()
        if resolution_data and 'resolution' in resolution_data:
            # Clean up any escaped markdown
            resolution_text = resolution_data['resolution']
            # Ensure markdown is properly formatted
            resolution_text = resolution_text.replace('\\*', '*')  # Unescape any escaped asterisks
            resolution_data['resolution'] = resolution_text
            
            return jsonify(resolution_data)
            
        return response
        
    except Exception as e:
        print(f"Error in handle_generate_resolution: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/render-resolution', methods=['POST'])
def render_resolution():
    try:
        data = request.get_json()
        markdown_text = data.get('markdown')
        if not markdown_text:
            return jsonify({"error": "No markdown text provided"}), 400
            
        # Clean up any escaped markdown
        markdown_text = markdown_text.replace('\\*', '*')  # Unescape any escaped asterisks
        
        # Convert markdown to HTML
        html = markdown.markdown(markdown_text)
        return jsonify({"html": html})
        
    except Exception as e:
        print(f"Error in render_resolution: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001) 