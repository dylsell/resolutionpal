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
from pydantic import BaseModel, Field
from typing import Literal, List, Optional, Union

# Load environment variables
load_dotenv()

# Get API key with error handling
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("OpenAI API key not found in .env file")

# Configure OpenAI
client = OpenAI(api_key=api_key)

# Question type definitions
class Question(BaseModel):
    type: str = Field(..., description="Question type: TEXT, CHOICE, or YES/NO")
    text: str = Field(..., description="The question text")
    options: Optional[List[str]] = Field(default=None, description="Options for CHOICE questions")

class QuestionChoice(BaseModel):
    type: Literal["CHOICE"]
    text: str
    options: List[str]

class QuestionYesNo(BaseModel):
    type: Literal["YES/NO"]
    text: str

class QuestionText(BaseModel):
    type: Literal["TEXT"]
    text: str

def format_question_data(data: dict) -> dict:
    """Format and validate question data to ensure consistent structure."""
    formatted = {
        "type": data.get("type", "TEXT").upper(),
        "text": data.get("text") or data.get("question", ""),
        "options": data.get("options", None)
    }
    
    # Clean up the type
    if formatted["type"] not in ["TEXT", "CHOICE", "YES/NO"]:
        formatted["type"] = "TEXT"
    
    # Ensure text is a string
    formatted["text"] = str(formatted["text"]).strip()
    
    # Handle options for CHOICE type
    if formatted["type"] == "CHOICE" and not formatted["options"]:
        formatted["type"] = "TEXT"  # Fallback to TEXT if no options provided
    
    # Clean up options if present
    if formatted["options"]:
        formatted["options"] = [str(opt).strip() for opt in formatted["options"]]
    
    return formatted

# Initialize Flask app
app = Flask(__name__, static_url_path='/static', static_folder='static')
CORS(app)

# Ensure the static directory exists
with app.app_context():
    os.makedirs('static', exist_ok=True)
    os.makedirs('static/images', exist_ok=True)

# Simple static file serving
@app.route('/static/<path:filename>')
def serve_static(filename):
    try:
        return send_from_directory('static', filename)
    except Exception as e:
        app.logger.error(f"Error serving static file {filename}: {str(e)}")
        return f"Error serving file: {str(e)}", 500

@app.route('/<path:filename>')
def serve_root_static(filename):
    try:
        return app.send_static_file(filename)
    except Exception as e:
        app.logger.error(f"Error serving root static file {filename}: {str(e)}")
        return f"Error serving file: {str(e)}", 500

def create_question_assistant():
    """Create a new assistant for asking questions"""
    return client.beta.assistants.create(
        name="Resolution Question Assistant",
        instructions="""You are an expert at asking insightful questions to help people create meaningful New Year's resolutions. 
Your role is to ask one question at a time to understand the person's goals, motivations, and circumstances.

IMPORTANT: You must ALWAYS format your responses as valid JSON with this structure:
{
    "type": "TEXT" | "CHOICE" | "YES/NO",
    "text": "Your question here",
    "options": ["option1", "option2", "option3"]  // Only for CHOICE type
}

Guidelines:
1. Keep questions concise (under 15 words)
2. Make questions specific to their resolution focus
3. Use appropriate question types:
   - TEXT: For open-ended responses
   - CHOICE: When offering specific options (must include options array)
   - YES/NO: For binary decisions
4. Never use numerical scales or ratings
5. Focus on understanding their specific situation and goals

Example responses:
{"type": "YES/NO", "text": "Have you tried setting this type of goal before?"}
{"type": "CHOICE", "text": "What's your biggest obstacle?", "options": ["Time", "Motivation", "Resources", "Knowledge"]}
{"type": "TEXT", "text": "What would success look like for this resolution?"}""",
        model="gpt-4-1106-preview",
        tools=[]
    )

def create_resolution_assistant():
    """Create a new resolution assistant for this session"""
    print("Creating new resolution assistant")
    return client.beta.assistants.create(
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
        
        # Create new assistants for this session
        question_assistant = create_question_assistant()
        resolution_assistant = create_resolution_assistant()
        print(f"Created assistants - Question: {question_assistant.id}, Resolution: {resolution_assistant.id}")
        
        thread = client.beta.threads.create()
        print(f"Thread created with ID: {thread.id}")
        
        # Store assistant IDs in the response
        session_data = {
            "question_assistant_id": question_assistant.id,
            "resolution_assistant_id": resolution_assistant.id,
            "thread_id": thread.id
        }
        
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
            f"You are helping {name} create a meaningful and achievable New Year's resolution focused on {resolution_type}. "
            f"Their initial idea is: {specific_resolution}\n\n"
            "Ask a strategic question that will help you understand what they need to succeed. "
            "Your goal is to gather information that will help create a SMART resolution "
            "(Specific, Measurable, Achievable, Relevant, Time-bound).\n\n"
            "Consider asking about:\n"
            "- Their current situation and starting point\n"
            "- Past experiences and what worked/didn't work\n"
            "- Available resources and support systems\n"
            "- Potential obstacles and how to overcome them\n"
            "- Their definition of success\n"
            "- Timeline and milestones\n\n"
            "Format your question as JSON:\n"
            "1. Keep it under 15 words\n"
            "2. Make it specific to their resolution focus\n"
            "3. Use this structure:\n"
            '{"type": "TEXT" | "CHOICE" | "YES/NO", "text": "Your question", "options": ["option1", "option2"] // for CHOICE only}'
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
        print(f"Run completed with status: {run.status}")
        
        messages = client.beta.threads.messages.list(thread_id=thread.id)
        first_question = messages.data[0].content[0].text.value
        print(f"Raw first question: {first_question}")
        
        try:
            # Try to parse as JSON
            if first_question.strip().startswith('{'):
                question_data = json.loads(first_question)
            else:
                # If not JSON, create a text question
                question_data = {
                    "type": "TEXT",
                    "text": first_question.strip()
                }
            
            # Format the data
            formatted_data = format_question_data(question_data)
            print(f"Formatted question data: {formatted_data}")
            
            # Validate with Pydantic
            question = Question(**formatted_data)
            print(f"Validated question: {question.model_dump()}")
            
            response_data = {
                "question": question.model_dump(),
                "threadId": thread.id,
                "questionNumber": 1,
                **session_data
            }
            print(f"Sending response: {response_data}")
            
            return jsonify(response_data)
            
        except Exception as e:
            print(f"Error processing first question: {str(e)}")
            print(f"Falling back to text question")
            
            # Fallback to simple text question
            response_data = {
                "question": {
                    "type": "TEXT",
                    "text": first_question.strip(),
                    "options": None
                },
                "threadId": thread.id,
                "questionNumber": 1,
                **session_data
            }
            print(f"Sending fallback response: {response_data}")
            
            return jsonify(response_data)
        
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
        question_assistant_id = data.get('question_assistant_id')
        resolution_assistant_id = data.get('resolution_assistant_id')
        
        if not all([thread_id, question_assistant_id, resolution_assistant_id]):
            raise ValueError("Missing required session data")
        
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
        if question_number >= 9:
            print("Reached final question, generating resolution...")
            return generate_resolution(thread_id)
            
        # Get the next question
        print("Creating run for next question...")
        run = client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=question_assistant_id,
            instructions=f"""Ask question #{question_number + 1}. 
            Remember to:
            1. Keep it under 15 words
            2. Make it specific to their previous answers
            3. Never repeat a previous question
            4. Vary the question type from the last question
            5. Return the response in the specified JSON format with type and text fields"""
        )
        print(f"Run created with ID: {run.id}")
        
        run = wait_for_run(thread_id, run.id)
        
        # Get the assistant's response
        print("Retrieving assistant's response...")
        messages = client.beta.threads.messages.list(thread_id=thread_id)
        last_message = messages.data[0].content[0].text.value
        print(f"Raw response: {last_message}")
        
        try:
            # Parse the response as JSON
            question_data = json.loads(last_message)
            # Format the data to match our expected structure
            formatted_data = format_question_data(question_data)
            # Validate with Pydantic
            question = Question(**formatted_data)
            
            return jsonify({
                "question": question.model_dump(),
                "threadId": thread_id,
                "questionNumber": question_number + 1,
                "question_assistant_id": question_assistant_id,
                "resolution_assistant_id": resolution_assistant_id
            })
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            # Fallback to text extraction
            return jsonify({
                "question": {
                    "type": "TEXT",
                    "text": last_message.strip(),
                    "options": None
                },
                "threadId": thread_id,
                "questionNumber": question_number + 1,
                "question_assistant_id": question_assistant_id,
                "resolution_assistant_id": resolution_assistant_id
            })
            
        except Exception as e:
            print(f"Error processing question: {e}")
            return jsonify({
                "question": {
                    "type": "TEXT",
                    "text": "Error processing question. Please try again.",
                    "options": None
                },
                "threadId": thread_id,
                "questionNumber": question_number + 1,
                "question_assistant_id": question_assistant_id,
                "resolution_assistant_id": resolution_assistant_id
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
            assistant_id=resolution_assistant_id, # type: ignore
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

@app.route('/submit_answer', methods=['POST'])
def submit_answer():
    try:
        print("\n=== Processing Answer Submission ===")
        data = request.json
        thread_id = data.get('threadId')
        answer = data.get('answer')
        question_assistant_id = data.get('questionAssistantId')
        resolution_assistant_id = data.get('resolutionAssistantId')
        question_number = int(data.get('questionNumber', 1))

        print(f"Current Question Number: {question_number}")
        print(f"Thread ID: {thread_id}")
        print(f"Answer: {answer}")

        if not all([thread_id, answer, question_assistant_id, resolution_assistant_id]):
            raise ValueError("Missing required data for answer submission")

        # Add the user's answer to the thread
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=answer
        )
        print("Added user's answer to thread")

        # We want to generate resolution after the 5th question (when question_number is 5)
        if question_number >= 5:
            print(f"\n=== Generating Resolution (Question {question_number}) ===")
            
            # Get all messages and organize them into Q&A pairs
            messages = client.beta.threads.messages.list(thread_id=thread_id)
            conversation_pairs = []
            
            # Messages are in reverse chronological order, so we need to reverse them
            message_list = list(reversed(messages.data))
            
            # Skip the initial user info message
            for i in range(1, len(message_list), 2):
                if i + 1 < len(message_list):
                    question = message_list[i].content[0].text.value
                    answer = message_list[i + 1].content[0].text.value
                    # Clean up the question format if it's JSON
                    if question.strip().startswith('{'):
                        try:
                            q_data = json.loads(question)
                            question = q_data.get('text', question)
                        except:
                            pass
                    conversation_pairs.append(f"Q: {question}\nA: {answer}")
            
            # Get the initial user info
            initial_info = message_list[0].content[0].text.value
            
            # Format the conversation history
            conversation_history = (
                f"Initial User Information:\n{initial_info}\n\n"
                "Conversation History:\n" + 
                "\n\n".join(conversation_pairs)
            )
            
            print("\nFormatted conversation history:")
            print(conversation_history)
            
            # Create new thread for resolution
            new_thread = client.beta.threads.create()
            print(f"\nCreated new thread for resolution: {new_thread.id}")
            
            # Add the formatted conversation history
            client.beta.threads.messages.create(
                thread_id=new_thread.id,
                role="user",
                content=f"""Please create a personalized resolution plan based on this conversation:

{conversation_history}

The user has shared their goals, challenges, and preferences through this conversation.
Please use all of this information to create a detailed, personalized resolution plan."""
            )
            
            instructions = """
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
Format your response using this exact structure:

<div class="resolution-card">
    <h1 class="resolution-title">[Personal and specific title]</h1>
    
    <h2>Your Vision</h2>
    <p>[2-3 sentences describing ideal end state]</p>
    
    <h2>Key Goals</h2>
    <ul>
        [3-5 specific, measurable sub-goals]
    </ul>
    
    <h2>Why This Matters</h2>
    <p>[Connect to their specific motivation and situation]</p>
    
    <h2>Action Plan</h2>
    <h3>January (Getting Started)</h3>
    <ul>
        [3-5 specific actions with resource links]
    </ul>
    
    <h3>February-March (Building Habits)</h3>
    <ul>
        [3-5 actions with community links]
    </ul>
    
    <h3>April-June (Growing Stronger)</h3>
    <ul>
        [3-5 actions with progressive resources]
    </ul>
    
    <h3>July-September (Maintaining Momentum)</h3>
    <ul>
        [3-5 actions with support links]
    </ul>
    
    <h3>October-December (Achieving Milestones)</h3>
    <ul>
        [3-5 actions with advanced resources]
    </ul>
    
    <h2>Key Milestones</h2>
    <ul>
        [4-5 specific checkpoints with dates and links]
    </ul>
    
    <h2>Tools and Resources</h2>
    <ul>
        [4-6 specific tools/resources with links]
    </ul>
    
    <h2>Your Support System</h2>
    <ul>
        [List of communities and support groups with links]
    </ul>
    
    <h2>Words of Encouragement</h2>
    <p>[Personal and motivating message based on their situation]</p>
</div>

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

FORMATTING REMINDERS:
- Use proper HTML tags throughout
- Format dates as <b>Date</b>: Description
- Use <b>bold</b> for emphasis
- Use <a href="URL">descriptive text</a> for links
- Keep paragraphs focused and concise
- Make every section highly specific to their situation
- Use their location data to enhance the plan naturally

Important:
1. Make the resolution SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
2. Use bullet points for all lists
3. Keep the tone encouraging but realistic
4. Base everything on the user's actual responses
5. DO NOT ask any questions - this is the final resolution
6. Use the exact HTML structure provided"""

            try:
                print("Creating resolution run...")
                run = client.beta.threads.runs.create(
                    thread_id=new_thread.id,
                    assistant_id=resolution_assistant_id,
                    instructions=instructions
                )
                print(f"Created resolution run with ID: {run.id}")
                
                run = wait_for_run(new_thread.id, run.id)
                print(f"Resolution run completed with status: {run.status}")
                
                messages = client.beta.threads.messages.list(thread_id=new_thread.id)
                resolution = messages.data[0].content[0].text.value
                print("Successfully generated resolution")
                print(f"Resolution length: {len(resolution)} characters")
                
                return jsonify({
                    "done": True,
                    "resolution": resolution
                })
            except Exception as e:
                print(f"Error generating resolution: {str(e)}")
                print(f"Full resolution error traceback: {traceback.format_exc()}")
                raise

        # Get next question
        print(f"\n=== Getting Question {question_number + 1} ===")
        instructions = (
            "Based on the previous answers, ask your next strategic question to help create a meaningful resolution. "
            "Each question should build towards creating a SMART resolution "
            "(Specific, Measurable, Achievable, Relevant, Time-bound).\n\n"
            "Consider what information you still need about:\n"
            "- Specific goals and desired outcomes\n"
            "- How to measure progress\n"
            "- Resources and support needed\n"
            "- Realistic timeframes\n"
            "- Potential obstacles\n"
            "- Motivation and commitment level\n\n"
            "Format your question as JSON:\n"
            "1. Keep it under 15 words\n"
            "2. Make it specific to their resolution focus\n"
            "3. Use this structure:\n"
            '{"type": "TEXT" | "CHOICE" | "YES/NO", "text": "Your question", "options": ["option1", "option2"] // for CHOICE only}'
        ).strip()

        run = client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=question_assistant_id,
            instructions=instructions
        )
        print(f"Created question run with ID: {run.id}")

        run = wait_for_run(thread_id, run.id)
        print(f"Question run completed with status: {run.status}")

        messages = client.beta.threads.messages.list(thread_id=thread_id)
        next_question = messages.data[0].content[0].text.value
        print(f"Raw question response: {next_question}")

        try:
            # Try to parse as JSON
            if next_question.strip().startswith('{'):
                question_data = json.loads(next_question)
            else:
                # If not JSON, create a text question
                question_data = {
                    "type": "TEXT",
                    "text": next_question.strip()
                }

            # Format the data
            formatted_data = format_question_data(question_data)
            print(f"Formatted question data: {formatted_data}")

            # Validate with Pydantic
            question = Question(**formatted_data)
            print(f"Validated question: {question.model_dump()}")

            return jsonify({
                "question": question.model_dump(),
                "threadId": thread_id,
                "questionNumber": question_number + 1,
                "questionAssistantId": question_assistant_id,
                "resolutionAssistantId": resolution_assistant_id,
                "done": False
            })

        except Exception as e:
            print(f"Error processing next question: {str(e)}")
            print(f"Falling back to text question")

            return jsonify({
                "question": {
                    "type": "TEXT",
                    "text": next_question.strip(),
                    "options": None
                },
                "threadId": thread_id,
                "questionNumber": question_number + 1,
                "questionAssistantId": question_assistant_id,
                "resolutionAssistantId": resolution_assistant_id,
                "done": False
            })

    except Exception as e:
        print(f"Error in submit_answer: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001) 