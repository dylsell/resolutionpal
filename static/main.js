let userInfo = {};
let questionAnswers = [];
let currentQuestionNumber = 0;
let selectedOptions = new Set();
let isGeneratingResolution = false;
let generationTimeout = null;
let currentUserInfoQuestion = 0;
let threadId = null;

const userInfoQuestions = [
    {
        id: 'name',
        question: "👋 What's your name?",
        type: 'text',
        placeholder: 'Enter your name',
        step: 1,
        totalSteps: 4
    },
    {
        id: 'location',
        question: "🌍 Where are you located?",
        type: 'text',
        placeholder: 'Enter your city, state/province, or country',
        step: 2,
        totalSteps: 4
    },
    {
        id: 'resolutionCategory',
        question: "🎯 What type of resolution would you like to focus on?",
        type: 'select',
        options: [
            "Health & Fitness 🏃‍♂️",
            "Career Growth 💼",
            "Personal Development 🌱",
            "Financial Goals 💰",
            "Relationships 💝",
            "Learning & Education 📚",
            "Creative Projects 🎨",
            "Travel & Adventure ",
            "Sustainability & Environment 🌿",
            "Community & Social Impact 🤝"
        ],
        step: 3,
        totalSteps: 4
    },
    {
        id: 'resolutionType',
        type: 'select',
        question: '✨ Choose your specific resolution focus:',
        dependsOn: 'resolutionCategory',
        options: {
            "Health & Fitness 🏃‍♂️": [
                "Start a Consistent Exercise Routine - Build lasting fitness habits",
                "Achieve Target Weight - Through healthy and sustainable methods",
                "Master a New Sport/Activity - Challenge yourself physically",
                "Complete a Fitness Challenge - Train for a specific goal",
                "Transform Eating Habits - Focus on nutrition and meal planning",
                "Improve Sleep Quality - Develop better sleep routines",
                "Build Strength and Muscle - Focus on resistance training",
                "Enhance Flexibility - Incorporate stretching and mobility work"
            ],
            "Career Growth 💼": [
                "Achieve Promotion - Work towards career advancement",
                "Switch Careers - Transition to new professional path",
                "Start a Business - Launch entrepreneurial venture",
                "Develop Leadership Skills - Grow management abilities",
                "Get Professional Certification - Enhance qualifications",
                "Improve Work-Life Balance - Set better boundaries",
                "Build Personal Brand - Enhance professional presence",
                "Master New Industry Tools - Stay current with technology"
            ],
            "Personal Development 🌱": [
                "Learn a New Language - Achieve conversational fluency",
                "Master a Creative Skill - Develop artistic abilities",
                "Read More Books - Expand knowledge and perspectives",
                "Start Journaling - Practice self-reflection and writing",
                "Learn to Play an Instrument - Develop musical abilities",
                "Take Online Courses - Expand educational horizons",
                "Practice Public Speaking - Improve communication skills",
                "Develop Time Management - Enhance productivity and efficiency"
            ],
            "Financial Goals 💰": [
                "Create Emergency Fund - Build financial security",
                "Start Investing - Learn and grow investment portfolio",
                "Pay Off Specific Debt - Focus on debt elimination",
                "Increase Income - Through side hustles or career growth",
                "Budget Management - Track and optimize spending",
                "Save for Major Purchase - Work towards specific goal",
                "Learn Financial Planning - Develop money management skills",
                "Start Retirement Planning - Focus on long-term security"
            ],
            "Relationships 💝": [
                "Strengthen Family Bonds - Spend quality time with family",
                "Deepen Friendships - Nurture meaningful connections",
                "Improve Communication - Enhance relationship skills",
                "Find Partner/Romance - Focus on dating and relationships",
                "Be More Present - Practice active listening and engagement",
                "Host Regular Gatherings - Create social connections",
                "Resolve Past Conflicts - Work on forgiveness and healing",
                "Build Professional Network - Expand professional relationships"
            ],
            "Learning & Education 📚": [
                "Complete Online Course - Master new subject area",
                "Learn Programming - Develop coding skills",
                "Study New Language - Achieve language certification",
                "Write a Book/Blog - Share knowledge and experiences",
                "Master Digital Skills - Enhance technical abilities",
                "Take Art Classes - Develop creative expression",
                "Study History/Culture - Broaden cultural understanding",
                "Learn Musical Instrument - Develop musical abilities"
            ],
            "Creative Projects 🎨": [
                "Start Art Portfolio - Build creative body of work",
                "Write Novel/Story - Complete creative writing project",
                "Learn Photography - Master camera and editing skills",
                "Start YouTube Channel - Create engaging content",
                "Design Digital Art - Develop graphic design skills",
                "Create Music - Compose and produce original works",
                "Start Craft Business - Turn creativity into income",
                "Build Website/App - Develop web presence"
            ],
            "Travel & Adventure 🌎": [
                "Visit New Countries - Explore different cultures",
                "Learn Adventure Sport - Master outdoor activities",
                "Plan Road Trip - Explore local destinations",
                "Live Abroad - Experience different culture",
                "Learn Local History - Discover community heritage",
                "Start Travel Blog - Document adventures",
                "Master Photography - Capture travel moments",
                "Learn Local Language - Prepare for travel"
            ],
            "Sustainability & Environment 🌿": [
                "Reduce Carbon Footprint - Adopt eco-friendly habits",
                "Start Composting - Reduce waste impact",
                "Create Garden - Grow own produce",
                "Learn About Sustainability - Educate on environmental issues",
                "Join Environmental Group - Support local initiatives",
                "Adopt Zero-Waste - Minimize environmental impact",
                "Use Renewable Energy - Switch to sustainable power",
                "Start Recycling Program - Organize community effort"
            ],
            "Community & Social Impact 🤝": [
                "Regular Volunteering - Serve local community",
                "Start Nonprofit - Create positive change",
                "Mentor Others - Share knowledge and experience",
                "Lead Community Project - Organize local initiatives",
                "Support Local Business - Build community connections",
                "Teach Skills - Help others learn",
                "Organize Events - Build community engagement",
                "Advocate for Change - Support important causes"
            ]
        },
        step: 4,
        totalSteps: 4
    }
];

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded, initializing app...');
    displayUserInfoQuestion();
});

// Update the progress bar based on current step
function updateProgressBar() {
    const currentStep = userInfoQuestions[currentUserInfoQuestion]?.step || 1;
    const totalSteps = userInfoQuestions[currentUserInfoQuestion]?.totalSteps || 1;
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        const percentage = (currentStep / totalSteps) * 100;
        progressFill.style.width = `${percentage}%`;
        console.log(`Updating progress bar: ${percentage}%`);
    } else {
        console.error('Progress bar element not found');
    }
}

// Display the current user info question
function displayUserInfoQuestion() {
    console.log('Displaying user info question:', currentUserInfoQuestion);
    const question = userInfoQuestions[currentUserInfoQuestion];
    const form = document.getElementById('user-info-form');
    const content = form.querySelector('.space-y-6');
    
    updateProgressBar();
    
    if (question.type === 'select') {
        if (question.dependsOn) {
            // This is the specific resolution selection
            const selectedCategory = userInfo['resolutionCategory'];
            const options = question.options[selectedCategory];
            
            if (!options) {
                console.error('No options found for category:', selectedCategory);
                return;
            }
            
            content.innerHTML = `
                <h2 class="text-4xl font-bold text-[#213343] mb-4">${question.question}</h2>
                <p class="text-[#213343]/70 mb-6">Category: ${selectedCategory}</p>
                <div class="grid gap-3 max-h-[60vh] overflow-y-auto pr-2">
                    ${options.map(option => `
                        <button type="button" 
                                onclick="handleSelect('${option.replace(/'/g, "\\'")}')"
                                class="w-full text-left px-6 py-4 rounded-lg 
                                       text-xl font-medium
                                       bg-white border-2 border-[#FC3D4C]/50
                                       text-[#213343] hover:bg-[#FC3D4C]/5
                                       transition-all duration-200
                                       hover:border-[#FC3D4C]
                                       focus:outline-none focus:ring-2 focus:ring-[#FC3D4C]/50
                                       active:bg-[#FC3D4C]/10">
                            ${option}
                        </button>
                    `).join('')}
                </div>
            `;
        } else {
            // This is the category selection
            content.innerHTML = `
                <h2 class="text-4xl font-bold text-[#213343] mb-4">${question.question}</h2>
                <div class="grid gap-3 max-h-[60vh] overflow-y-auto pr-2">
                    ${question.options.map(option => `
                        <button type="button" 
                                onclick="handleSelect('${option.replace(/'/g, "\\'")}')"
                                class="w-full text-left px-6 py-4 rounded-lg 
                                       text-xl font-medium
                                       bg-white border-2 border-[#FC3D4C]/50
                                       text-[#213343] hover:bg-[#FC3D4C]/5
                                       transition-all duration-200
                                       hover:border-[#FC3D4C]
                                       focus:outline-none focus:ring-2 focus:ring-[#FC3D4C]/50
                                       active:bg-[#FC3D4C]/10">
                            ${option}
                        </button>
                    `).join('')}
                </div>
            `;
        }
    } else {
        content.innerHTML = `
            <h2 class="text-4xl font-bold text-[#213343]">${question.question}</h2>
            <div class="relative mt-6">
                <input
                    type="${question.type}"
                    name="${question.id}"
                    class="w-full px-6 py-4 rounded-lg 
                           text-xl font-medium bg-white 
                           border-2 border-[#FC3D4C]/50
                           text-[#213343] 
                           focus:border-[#FC3D4C] focus:outline-none focus:ring-2 focus:ring-[#FC3D4C]/50
                           transition-all duration-200"
                    placeholder="${question.placeholder}"
                    required
                    autofocus
                />
                <button onclick="handleTextInput()"
                        disabled
                        class="continue-button w-full mt-6 py-4 rounded-lg
                               bg-[#FC3D4C] text-white
                               hover:bg-[#FC3D4C]/90
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-200">
                    Continue →
                </button>
            </div>
        `;

        const input = content.querySelector('input');
        const continueButton = content.querySelector('.continue-button');
        
        if (input) {
            input.focus();
            input.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                if (continueButton) {
                    continueButton.disabled = !value;
                    if (value) {
                        continueButton.classList.remove('opacity-50', 'cursor-not-allowed');
                    } else {
                        continueButton.classList.add('opacity-50', 'cursor-not-allowed');
                    }
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && input.value.trim()) {
                    e.preventDefault();
                    handleTextInput();
                }
            });
        }
    }
}

// Handle answer submission for user info
function handleUserInfoAnswer(value) {
    console.log('Handling user info answer:', value);
    const question = userInfoQuestions[currentUserInfoQuestion];
    userInfo[question.id] = value;
    
    if (currentUserInfoQuestion < userInfoQuestions.length - 1) {
        currentUserInfoQuestion++;
        displayUserInfoQuestion();
    } else {
        startAIQuestions();
    }
}

// Handle text input submission
function handleTextInput() {
    const input = document.querySelector('input');
    if (input && input.value.trim()) {
        handleUserInfoAnswer(input.value.trim());
    }
}

// Toggle selection for multiselect questions
function toggleSelection(button, option) {
    const maxSelect = userInfoQuestions[currentUserInfoQuestion].maxSelect;
    const minSelect = userInfoQuestions[currentUserInfoQuestion].minSelect;
    
    if (selectedOptions.has(option)) {
        selectedOptions.delete(option);
        button.style.backgroundColor = '';
        button.classList.remove('border-[#FC3D4C]');
        button.classList.add('border-[#FC3D4C]/50');
    } else if (selectedOptions.size < maxSelect) {
        selectedOptions.add(option);
        button.style.backgroundColor = '#FFF5F5';
        button.classList.add('border-[#FC3D4C]');
        button.classList.remove('border-[#FC3D4C]/50');
    }

    // Enable/disable continue button based on selection
    const continueButton = document.querySelector('.continue-button');
    continueButton.disabled = selectedOptions.size < minSelect;
}

// Handle multiselect answer submission
function handleMultiSelect() {
    const minSelect = userInfoQuestions[currentUserInfoQuestion].minSelect;
    if (selectedOptions.size >= minSelect) {
        handleUserInfoAnswer(Array.from(selectedOptions));
        selectedOptions.clear();
    }
}

// Handle regular select option
function handleSelect(value) {
    console.log('Selected value:', value);
    const question = userInfoQuestions[currentUserInfoQuestion];
    userInfo[question.id] = value;
    console.log('Updated userInfo:', userInfo);
    
    // Move to next question
    currentUserInfoQuestion++;
    
    if (currentUserInfoQuestion < userInfoQuestions.length) {
        displayUserInfoQuestion();
    } else {
        console.log('All user info collected:', userInfo);
        startAIQuestions();
    }
}

// Show a generic error message
function showErrorMessage(message) {
    const questionForm = document.getElementById('question-form');
    questionForm.innerHTML = `
        <div class="space-y-6 text-white">
            <h2 class="text-4xl font-bold">Oops! Something went wrong</h2>
            <p>${message}</p>
        </div>
    `;
}

// Show loading overlay
function showLoading() {
    if (!document.getElementById('loading-overlay')) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.className = 'loading-container';
        loadingOverlay.innerHTML = '<img src="/static/resolutionpal.png" class="loading-avatar" alt="Loading...">';
        document.body.appendChild(loadingOverlay);
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Start AI questions after user info is complete
async function startAIQuestions() {
    try {
        // Hide user info form and show question form
        const userInfoForm = document.getElementById('user-info-form');
        const questionForm = document.getElementById('question-form');
        
        if (!userInfoForm || !questionForm) {
            throw new Error('Required form elements not found');
        }
        
        // Show loading state in the question form
        questionForm.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div class="loading-container mb-8">
                    <img src="/static/resolutionpal.png" class="loading-avatar" alt="Loading...">
                </div>
                <h2 class="text-4xl font-bold text-[#213343] mb-4">Starting Your Resolution Journey</h2>
                <p class="text-xl text-[#213343]/70">Preparing your personalized questions...</p>
            </div>
        `;
        
        userInfoForm.style.display = 'none';
        questionForm.style.display = 'block';
        
        console.log('Sending user info:', userInfo);
        const response = await fetch('/start_session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: userInfo.name || 'User',
                location: userInfo.location || '',
                resolutionType: userInfo.resolutionCategory || '',
                specificResolution: userInfo.resolutionType || ''
            })
        });

        const data = await response.json();
        console.log('Session started:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to start session');
        }
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Store the thread ID
        threadId = data.threadId;
        
        if (!data.question) {
            throw new Error('No question received from the assistant');
        }
        
        // Display the first question
        displayQuestion(data);
    } catch (error) {
        console.error('Error in startAIQuestions:', error);
        const questionForm = document.getElementById('question-form');
        if (questionForm) {
            questionForm.innerHTML = `
                <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div class="text-[#FC3D4C] mb-6">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-[#213343] mb-4">Oops! Something went wrong</h2>
                    <p class="text-lg text-[#213343]/70 mb-6">${error.message}</p>
                    <button onclick="location.reload()" 
                            class="px-6 py-3 bg-[#FC3D4C] text-white rounded-lg hover:bg-[#FC3D4C]/90 transition-colors">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Helper function to parse choice options
function parseChoiceOptions(questionText) {
    console.log('Parsing options from:', questionText);
    
    // First try to find options in parentheses
    const optionsMatch = questionText.match(/\((.*?)\)/);
    if (!optionsMatch) {
        console.warn('No options found in parentheses');
        return [];
    }

    // Get the options string from inside the parentheses
    const optionsString = optionsMatch[1];
    console.log('Found options string:', optionsString);

    // Split options by comma OR "or" OR "and", handling whitespace
    const options = optionsString
        .split(/\s*,\s*|\s+or\s+|\s+and\s+/)
        .map(opt => opt.trim())
        .filter(opt => opt && opt.toLowerCase() !== 'other'); // Remove empty strings and existing "Other"

    console.log('Parsed options:', options);
    
    // Always add "Other" as the final option
    options.push('Other');
    
    return options;
}

function displayQuestion(data) {
    console.log('Displaying question:', data);
    
    try {
        const questionForm = document.getElementById('question-form');
        if (!questionForm) {
            throw new Error('Question form element not found');
        }
        
        // Clear any existing content first
        questionForm.innerHTML = '<div class="space-y-6"></div>';
        const content = questionForm.querySelector('.space-y-6');
        
        // Update progress bar
        const progressPercentage = (currentQuestionNumber / 10) * 100;
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progressPercentage}%`;
        }

        // Show question number and text
        const questionNumber = currentQuestionNumber + 1;
        const totalQuestions = 10;

        // Parse the question format
        let questionType = 'text';
        let cleanQuestion = data.question || '';
        let options = [];

        // Try to parse the question type and text
        if (cleanQuestion) {
            const typeMatch = cleanQuestion.match(/^\[(YES\/NO|CHOICE|TEXT)\]\s*(.*)/i);
            if (typeMatch) {
                questionType = typeMatch[1].toLowerCase();
                cleanQuestion = typeMatch[2];

                // For choice questions, keep the full text including options
                if (questionType === 'choice') {
                    options = parseChoiceOptions(data.question);
                    if (options.length <= 1) {
                        console.warn('No valid options found for choice question:', data.question);
                        questionType = 'text';
                    }
                }
            } else {
                console.warn('No question type indicator found, defaulting to text');
                questionType = 'text';
            }
        }

        // Clean up the question text by only removing the type indicator
        cleanQuestion = cleanQuestion
            .replace(/^\[(YES\/NO|CHOICE|TEXT)\]\s*/i, '')  // Remove only the type indicator
            .trim();

        console.log('Parsed question:', {
            type: questionType,
            text: cleanQuestion,
            options: options
        });

        // Render the appropriate input type
        switch (questionType) {
            case 'choice':
                if (options.length > 0) {
                    content.innerHTML = `
                        <div class="text-sm text-[#213343]/70 mb-2">Question ${questionNumber} of ${totalQuestions}</div>
                        <h2 class="text-4xl font-bold text-[#213343] mb-6">${cleanQuestion}</h2>
                        <div class="grid gap-3 max-h-[60vh] overflow-y-auto pr-2">
                            ${options.map(option => `
                                ${option.toLowerCase() === 'other' ? `
                                    <div class="space-y-2">
                                        <button type="button" 
                                                onclick="toggleOtherInput(this)"
                                                class="w-full text-left px-6 py-4 rounded-lg 
                                                       text-xl font-medium
                                                       bg-white border-2 border-[#FC3D4C]/50
                                                       text-[#213343] hover:bg-[#FC3D4C]/5
                                                       transition-all duration-200
                                                       hover:border-[#FC3D4C]
                                                       focus:outline-none focus:ring-2 focus:ring-[#FC3D4C]/50
                                                       active:bg-[#FC3D4C]/10">
                                            Other
                                        </button>
                                        <div class="other-input hidden">
                                            <input type="text"
                                                   class="w-full px-6 py-4 rounded-lg 
                                                          text-xl font-medium bg-white 
                                                          border-2 border-[#FC3D4C]/50
                                                          text-[#213343] 
                                                          focus:border-[#FC3D4C] focus:outline-none 
                                                          focus:ring-2 focus:ring-[#FC3D4C]/50
                                                          transition-all duration-200"
                                                   placeholder="Please specify..."
                                                   onkeydown="if(event.key === 'Enter' && this.value.trim()) handleAnswer('Other: ' + this.value.trim())"
                                            />
                                        </div>
                                    </div>
                                ` : `
                                    <button type="button" 
                                            onclick="handleAnswer('${option.replace(/'/g, "\\'")}')"
                                            class="w-full text-left px-6 py-4 rounded-lg 
                                                   text-xl font-medium
                                                   bg-white border-2 border-[#FC3D4C]/50
                                                   text-[#213343] hover:bg-[#FC3D4C]/5
                                                   transition-all duration-200
                                                   hover:border-[#FC3D4C]
                                                   focus:outline-none focus:ring-2 focus:ring-[#FC3D4C]/50
                                                   active:bg-[#FC3D4C]/10">
                                        ${option}
                                    </button>
                                `}
                            `).join('')}
                        </div>
                    `;
                } else {
                    console.warn('No options found for choice question:', data.question);
                    questionType = 'text';
                }
                break;

            case 'yes/no':
                content.innerHTML = `
                    <div class="text-sm text-[#213343]/70 mb-2">Question ${questionNumber} of ${totalQuestions}</div>
                    <h2 class="text-4xl font-bold text-[#213343] mb-6">${cleanQuestion}</h2>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="handleAnswer('Yes')"
                                class="w-full py-4 px-6 bg-[#FC3D4C] text-white rounded-lg 
                                       hover:bg-[#FC3D4C]/90 transition-colors">
                            Yes
                        </button>
                        <button onclick="handleAnswer('No')"
                                class="w-full py-4 px-6 bg-white text-[#FC3D4C] rounded-lg 
                                       border-2 border-[#FC3D4C]
                                       hover:bg-[#FC3D4C]/5 transition-colors">
                            No
                        </button>
                    </div>
                `;
                break;

            case 'text':
            default:
                content.innerHTML = `
                    <div class="text-sm text-[#213343]/70 mb-2">Question ${questionNumber} of ${totalQuestions}</div>
                    <h2 class="text-4xl font-bold text-[#213343] mb-6">${cleanQuestion}</h2>
                    <div class="relative mt-6">
                        <input
                            type="text"
                            class="w-full px-6 py-4 rounded-lg 
                                   text-xl font-medium bg-white 
                                   border-2 border-[#FC3D4C]/50
                                   text-[#213343] 
                                   focus:border-[#FC3D4C] focus:outline-none focus:ring-2 focus:ring-[#FC3D4C]/50
                                   transition-all duration-200"
                            placeholder="Type your answer here..."
                            required
                            autofocus
                            oninput="document.querySelector('.continue-button').disabled = !this.value.trim()"
                        />
                        <button onclick="handleAnswer(document.querySelector('input').value)"
                                disabled
                                class="continue-button w-full mt-4 py-4 px-6 bg-[#FC3D4C] text-white rounded-lg 
                                       hover:bg-[#FC3D4C]/90 transition-colors
                                       disabled:opacity-50 disabled:cursor-not-allowed">
                            Continue →
                        </button>
                    </div>
                `;

                // Add Enter key handler
                const textInput = content.querySelector('input[type=text]');
                if (textInput) {
                    textInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && textInput.value.trim()) {
                            e.preventDefault();
                            handleAnswer(textInput.value);
                        }
                    });
                }
                break;
        }
    } catch (error) {
        console.error('Error in displayQuestion:', error);
        const questionForm = document.getElementById('question-form');
        if (questionForm) {
            questionForm.innerHTML = `
                <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div class="text-[#FC3D4C] mb-6">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-[#213343] mb-4">Oops! Something went wrong</h2>
                    <p class="text-lg text-[#213343]/70 mb-6">${error.message}</p>
                    <button onclick="location.reload()" 
                            class="px-6 py-3 bg-[#FC3D4C] text-white rounded-lg hover:bg-[#FC3D4C]/90 transition-colors">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Handle answer submission
async function handleAnswer(answer) {
    try {
        console.log('Handling answer:', answer);
        
        if (!threadId) {
            throw new Error('No active thread');
        }
        
        // Show loading state
        const questionForm = document.getElementById('question-form');
        if (questionForm) {
            questionForm.innerHTML = `
                <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div class="loading-container mb-8">
                        <img src="/static/resolutionpal.png" class="loading-avatar" alt="Loading...">
                    </div>
                    <h2 class="text-4xl font-bold text-[#213343] mb-4">
                        ${currentQuestionNumber >= 9 ? 'Generating Your Resolution Plan' : 'Processing Your Answer'}
                    </h2>
                    <p class="text-xl text-[#213343]/70">
                        ${currentQuestionNumber >= 9 ? 'Creating your personalized plan...' : 'Getting your next question ready...'}
                    </p>
                </div>
            `;
        }
        
        // Store the answer
        questionAnswers.push(answer);
        
        // Get the next question or generate resolution
        console.log('Sending request with:', {
            threadId,
            answer,
            questionNumber: currentQuestionNumber
        });
        
        const response = await fetch('/get_next_question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                threadId: threadId,
                answer: answer,
                questionNumber: currentQuestionNumber
            })
        });

        const data = await response.json();
        console.log('Received response:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get next question');
        }
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update the current question number
        currentQuestionNumber++;
        
        // Check if we have a resolution
        if (data.resolution !== undefined) {
            console.log('Displaying resolution with length:', data.resolution?.length);
            if (!data.resolution) {
                throw new Error('Empty resolution received');
            }
            displayResolution(data);
            return;
        }
        
        // Display the next question
        displayQuestion(data);
        
    } catch (error) {
        console.error('Error in handleAnswer:', error);
        const questionForm = document.getElementById('question-form');
        if (questionForm) {
            questionForm.innerHTML = `
                <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div class="text-[#FC3D4C] mb-6">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-[#213343] mb-4">Oops! Something went wrong</h2>
                    <p class="text-lg text-[#213343]/70 mb-6">${error.message}</p>
                    <button onclick="location.reload()" 
                            class="px-6 py-3 bg-[#FC3D4C] text-white rounded-lg hover:bg-[#FC3D4C]/90 transition-colors">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

function displayResolution(data) {
    console.log('Displaying resolution data:', data);
    const questionForm = document.getElementById('question-form');
    if (!questionForm) return;

    if (!data || !data.resolution) {
        console.error('Invalid resolution data:', data);
        questionForm.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div class="text-[#FC3D4C] mb-6">
                    <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-[#213343] mb-4">Resolution Generation Failed</h2>
                <p class="text-lg text-[#213343]/70 mb-6">Unable to generate your resolution. Please try again.</p>
                <button onclick="location.reload()" 
                        class="px-6 py-3 bg-[#FC3D4C] text-white rounded-lg hover:bg-[#FC3D4C]/90 transition-colors">
                    Start Over
                </button>
            </div>
        `;
        return;
    }

    // Hide the question form and show the results container
    const resultsContainer = document.getElementById('results');
    questionForm.style.display = 'none';
    resultsContainer.style.display = 'block';

    // Add custom styles for the resolution display
    const style = document.createElement('style');
    style.textContent = `
        .resolution-content {
            max-width: 800px;
            margin: 0 auto;
        }

        .resolution-section {
            background: white;
            border-radius: 1rem;
            padding: 2rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(252, 61, 76, 0.1);
        }

        .resolution-content h1 {
            font-size: 2.5rem;
            font-weight: 800;
            color: #213343;
            margin-bottom: 1.5rem;
            text-align: center;
            line-height: 1.2;
        }
        
        .resolution-content h2 {
            font-size: 1.8rem;
            font-weight: 700;
            color: #213343;
            margin-top: 2rem;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid rgba(252, 61, 76, 0.1);
        }
        
        .resolution-content h3 {
            font-size: 1.4rem;
            font-weight: 700;
            color: #213343;
            margin-top: 1.5rem;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid rgba(252, 61, 76, 0.1);
        }

        .resolution-content h4 {
            font-size: 1.2rem;
            font-weight: 600;
            color: #FC3D4C;
            margin-top: 1.25rem;
            margin-bottom: 0.75rem;
        }
        
        .resolution-content p {
            font-size: 1.1rem;
            line-height: 1.7;
            color: #213343;
            margin-bottom: 1.25rem;
        }
        
        .resolution-content ul {
            margin: 1rem 0;
            list-style: none;
            padding: 0;
        }
        
        .resolution-content li {
            font-size: 1.1rem;
            line-height: 1.7;
            color: #213343;
            margin-bottom: 0.75rem;
            padding-left: 1.5rem;
            position: relative;
            list-style-type: none;
        }
        
        .resolution-content li::before {
            content: "•";
            color: #FC3D4C;
            font-weight: bold;
            position: absolute;
            left: 0;
            top: 0;
        }
        
        .resolution-content strong,
        .resolution-content b {
            color: #FC3D4C;
            font-weight: 600;
            display: inline-block;
        }

        .section-heading {
            font-size: 1.4rem;
            font-weight: 700;
            color: #213343;
            margin-top: 2rem;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid rgba(252, 61, 76, 0.1);
        }

        .resolution-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .resolution-header img {
            width: 120px;
            height: 120px;
            margin: 0 auto 1rem;
        }

        .action-plan-section {
            background: #F8FAFC;
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin: 1rem 0;
        }

        .action-plan-month {
            border-left: 3px solid #FC3D4C;
            padding-left: 1rem;
            margin: 1rem 0;
        }
    `;
    document.head.appendChild(style);

    // Format the resolution text using marked
    let formattedResolution;
    try {
        if (typeof marked !== 'undefined') {
            const renderer = new marked.Renderer();
            
            // Custom renderer for headings
            renderer.heading = (text, level) => {
                // Remove any leading hash marks and trim
                text = text.replace(/^#+\s*/, '').trim();
                
                // Special handling for section headings
                const sectionHeadings = [
                    'Vision',
                    'Key Goals',
                    'Personal Motivation',
                    'Action Plan',
                    'Milestones',
                    'Resources and Tools',
                    'Support System',
                    'Encouragement'
                ];

                if (sectionHeadings.includes(text)) {
                    return `<h3 class="section-heading">${text}</h3>`;
                }
                
                switch (level) {
                    case 1:
                        return `<h1 class="text-center">${text}</h1>`;
                    case 2:
                        return `<h2>${text}</h2>`;
                    case 3:
                        return `<h3>${text}</h3>`;
                    case 4:
                        return `<h4 class="action-plan-month">${text}</h4>`;
                    default:
                        return `<h${level}>${text}</h${level}>`;
                }
            };

            // Custom renderer for strong/bold text
            renderer.strong = (text) => {
                return `<strong class="text-[#FC3D4C] font-semibold">${text}</strong>`;
            };

            // Custom renderer for lists
            renderer.list = (body, ordered) => {
                return `<ul class="resolution-list">${body}</ul>`;
            };

            // Custom renderer for list items
            renderer.listitem = (text) => {
                return `<li>${text}</li>`;
            };
            
            marked.setOptions({
                renderer: renderer,
                gfm: true,
                breaks: true,
                smartLists: true
            });
            
            formattedResolution = marked.parse(data.resolution);
        } else {
            // Fallback formatting
            formattedResolution = data.resolution
                .split('\n')
                .map(line => {
                    // Remove leading hash marks and trim
                    line = line.replace(/^#+\s*/, '').trim();
                    
                    // Check for section headings
                    const sectionHeadings = [
                        'Vision',
                        'Key Goals',
                        'Personal Motivation',
                        'Action Plan',
                        'Milestones',
                        'Resources and Tools',
                        'Support System',
                        'Encouragement'
                    ];

                    if (sectionHeadings.includes(line)) {
                        return `<h3 class="section-heading">${line}</h3>`;
                    }
                    
                    if (line.startsWith('# ')) {
                        return `<h1 class="text-center">${line.substring(2)}</h1>`;
                    } else if (line.startsWith('## ')) {
                        return `<h2>${line.substring(3)}</h2>`;
                    } else if (line.startsWith('### ')) {
                        return `<h3>${line.substring(4)}</h3>`;
                    } else if (line.startsWith('#### ')) {
                        return `<h4 class="action-plan-month">${line.substring(5)}</h4>`;
                    } else if (line.startsWith('- ')) {
                        return `<li>${line.substring(2)}</li>`;
                    } else if (line.trim() === '') {
                        return '<br>';
                    } else {
                        // Handle bold text with ** or __
                        line = line.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong class="text-[#FC3D4C] font-semibold">$1$2</strong>');
                        return `<p>${line}</p>`;
                    }
                })
                .join('\n');
        }
    } catch (error) {
        console.error('Error formatting resolution:', error);
        formattedResolution = `<pre class="whitespace-pre-wrap">${data.resolution}</pre>`;
    }

    // Update the results container with the formatted resolution
    const resolutionsList = document.getElementById('resolutions-list');
    resolutionsList.innerHTML = `
        <div class="resolution-content">
            <div class="resolution-header">
                <img src="/static/resolutionpal.png" alt="ResolutionPal" class="mx-auto mb-6">
                <div class="text-[#213343]/70 text-sm mb-2">Your Personal Resolution Plan</div>
            </div>
            
            <div class="resolution-section">
                ${formattedResolution}
            </div>
            
            <div class="flex justify-center gap-4 mt-8 mb-12">
                <button onclick="window.print()" 
                        class="print-button px-6 py-3 bg-white text-[#FC3D4C] border-2 border-[#FC3D4C] rounded-lg 
                               hover:bg-[#FC3D4C]/5 transition-colors flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                    </svg>
                    Print Resolution
                </button>
                <button onclick="location.reload()" 
                        class="start-over-button px-6 py-3 bg-[#FC3D4C] text-white rounded-lg 
                               hover:bg-[#FC3D4C]/90 transition-colors flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Start Over
                </button>
            </div>
        </div>
    `;
}

// Simple function to calculate text similarity
function calculateSimilarity(str1, str2) {
    const words1 = str1.toLowerCase().split(/\W+/);
    const words2 = str2.toLowerCase().split(/\W+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
}

// Format the resolution content with proper HTML and styling
function formatContent(content) {
    if (Array.isArray(content)) {
        return content.map(item => `<li class="mb-2">${item}</li>`).join('');
    }
    return content.split('\n').map(line => `<p class="mb-2">${line}</p>`).join('');
}

// Helper function to process location data
function processLocationData(location) {
    if (!location) return null;
    
    const locationLower = location.toLowerCase();
    let context = {
        type: 'unknown',
        climate: 'unknown',
        hemisphere: 'unknown'
    };
    
    // Determine hemisphere
    if (locationLower.includes('australia') || 
        locationLower.includes('zealand') || 
        locationLower.includes('argentina') || 
        locationLower.includes('chile') || 
        locationLower.includes('brazil') || 
        locationLower.includes('south africa')) {
        context.hemisphere = 'southern';
    } else {
        context.hemisphere = 'northern';
    }
    
    // Determine if urban/rural/suburban
    if (locationLower.includes('city') || 
        locationLower.includes('york') || 
        locationLower.includes('london') || 
        locationLower.includes('tokyo') || 
        locationLower.includes('angeles')) {
        context.type = 'urban';
    } else if (locationLower.includes('town') || 
               locationLower.includes('suburb')) {
        context.type = 'suburban';
    } else if (locationLower.includes('rural') || 
               locationLower.includes('village') || 
               locationLower.includes('county')) {
        context.type = 'rural';
    }
    
    // Determine climate zone (simplified)
    if (locationLower.includes('california') || 
        locationLower.includes('mediterranean') || 
        locationLower.includes('spain') || 
        locationLower.includes('italy') || 
        locationLower.includes('greece')) {
        context.climate = 'mediterranean';
    } else if (locationLower.includes('florida') || 
               locationLower.includes('hawaii') || 
               locationLower.includes('tropical')) {
        context.climate = 'tropical';
    } else if (locationLower.includes('alaska') || 
               locationLower.includes('canada') || 
               locationLower.includes('norway') || 
               locationLower.includes('sweden')) {
        context.climate = 'cold';
    }
    
    return context;
}

// Helper function to get seasonal context
function getSeasonalContext(locationContext) {
    const now = new Date();
    const month = now.getMonth();
    
    // Define seasons based on hemisphere
    if (locationContext.hemisphere === 'northern') {
        return {
            currentSeason: month >= 11 || month <= 1 ? 'winter' :
                          month >= 2 && month <= 4 ? 'spring' :
                          month >= 5 && month <= 7 ? 'summer' : 'fall',
            seasonalFactors: {
                winter: ['indoor activities', 'cold weather considerations', 'holiday season'],
                spring: ['outdoor activities', 'new beginnings', 'moderate weather'],
                summer: ['outdoor focus', 'longer days', 'warm weather activities'],
                fall: ['transitional period', 'academic alignment', 'cooling weather']
            }
        };
    } else {
        return {
            currentSeason: month >= 11 || month <= 1 ? 'summer' :
                          month >= 2 && month <= 4 ? 'fall' :
                          month >= 5 && month <= 7 ? 'winter' : 'spring',
            seasonalFactors: {
                summer: ['outdoor focus', 'longer days', 'warm weather activities'],
                fall: ['transitional period', 'academic alignment', 'cooling weather'],
                winter: ['indoor activities', 'cold weather considerations', 'holiday season'],
                spring: ['outdoor activities', 'new beginnings', 'moderate weather']
            }
        };
    }
}

// Helper function to format content with proper HTML
function formatContent(content) {
    if (!content) return '';
    
    // If content is an array, format as a list
    if (Array.isArray(content)) {
        return `
            <ul class="list-disc list-inside space-y-2">
                ${content.map(item => `<li>${item}</li>`).join('')}
            </ul>
        `;
    }
    
    // If content is a string, format paragraphs and lists
    return content
        .split('\n')
        .map(paragraph => {
            // Check if paragraph is a list item
            if (paragraph.trim().startsWith('-') || paragraph.trim().startsWith('•')) {
                return `<ul class="list-disc list-inside"><li>${paragraph.trim().substring(1).trim()}</li></ul>`;
            }
            // Regular paragraph
            return `<p>${paragraph}</p>`;
        })
        .join('');
}

async function getNextQuestion(answer) {
    try {
        console.log("Getting next question...");
        console.log("Current thread ID:", currentThreadId);
        console.log("Current answer:", answer);
        console.log("Current question number:", currentQuestionNumber);

        const loadingElement = document.getElementById('loading-message');
        if (loadingElement) {
            loadingElement.textContent = "Getting next question...";
            loadingElement.style.display = 'block';
        }

        const response = await fetch('/get_next_question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                threadId: currentThreadId,
                answer: answer,
                questionNumber: currentQuestionNumber
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get next question');
        }

        const data = await response.json();
        console.log("Received question data:", data);

        if (data.error) {
            throw new Error(data.error);
        }

        // Update the thread ID and question number
        currentThreadId = data.threadId;
        currentQuestionNumber = data.questionNumber;

        // Parse the question type and text
        const questionText = data.question;
        const typeMatch = questionText.match(/^\[(.*?)\]/);
        const questionType = typeMatch ? typeMatch[1].trim().toUpperCase() : 'TEXT';
        const cleanQuestion = questionText.replace(/^\[(.*?)\]/, '').trim();

        console.log("Question type:", questionType);
        console.log("Clean question:", cleanQuestion);

        // Update the UI
        document.getElementById('question-text').textContent = cleanQuestion;
        
        // Clear previous input
        const inputContainer = document.getElementById('input-container');
        inputContainer.innerHTML = '';

        // Create appropriate input based on question type
        switch (questionType) {
            case 'YES/NO':
                createYesNoButtons(inputContainer);
                break;
            case 'SCALE':
                createScaleInput(inputContainer);
                break;
            case 'CHOICE':
                createChoiceInput(inputContainer, cleanQuestion);
                break;
            case 'NUMBER':
                createNumberInput(inputContainer);
                break;
            default:
                createTextInput(inputContainer);
        }

        // Show the continue button
        const continueButton = document.getElementById('continue-button');
        if (continueButton) {
            continueButton.style.display = 'block';
            continueButton.disabled = true;
        }

        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

    } catch (error) {
        console.error('Error getting next question:', error);
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = error.message || 'Failed to get next question. Please try again.';
            errorMessage.style.display = 'block';
        }
        const loadingElement = document.getElementById('loading-message');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
}

// Helper function to create yes/no buttons
function createYesNoButtons(container) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex gap-4 justify-center mt-4';
    
    ['Yes', 'No'].forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.className = 'px-6 py-2 rounded-lg border-2 border-teal-500 hover:border-teal-600 focus:border-teal-600 transition-all duration-200';
        button.onclick = function() {
            // Remove selected class from all buttons
            buttonContainer.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('selected', 'bg-teal-500', 'text-white');
            });
            // Add selected class to clicked button
            button.classList.add('selected', 'bg-teal-500', 'text-white');
            // Enable continue button
            document.getElementById('continue-button').disabled = false;
        };
        buttonContainer.appendChild(button);
    });
    
    container.appendChild(buttonContainer);
}

// Helper function to create scale input
function createScaleInput(container) {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'flex flex-col items-center gap-4 mt-4';
    
    const rangeContainer = document.createElement('div');
    rangeContainer.className = 'w-full max-w-md flex items-center gap-2';
    
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '1';
    input.max = '10';
    input.value = '5';
    input.className = 'w-full';
    
    const value = document.createElement('span');
    value.textContent = input.value;
    value.className = 'text-lg font-semibold';
    
    input.oninput = function() {
        value.textContent = this.value;
        document.getElementById('continue-button').disabled = false;
    };
    
    rangeContainer.appendChild(input);
    rangeContainer.appendChild(value);
    inputContainer.appendChild(rangeContainer);
    container.appendChild(inputContainer);
}

// Helper function to create choice input
function createChoiceInput(container, question) {
    const matches = question.match(/\((.*?)\)/);
    let options = matches ? matches[1].split(',').map(opt => opt.trim()) : ['Option 1', 'Option 2', 'Option 3'];
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex flex-wrap gap-4 justify-center mt-4';
    
    options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.className = 'px-6 py-2 rounded-lg border-2 border-teal-500 hover:border-teal-600 focus:border-teal-600 transition-all duration-200';
        button.onclick = function() {
            buttonContainer.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('selected', 'bg-teal-500', 'text-white');
            });
            button.classList.add('selected', 'bg-teal-500', 'text-white');
            document.getElementById('continue-button').disabled = false;
        };
        buttonContainer.appendChild(button);
    });
    
    container.appendChild(buttonContainer);
}

// Helper function to create number input
function createNumberInput(container) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'mt-4 px-4 py-2 border-2 border-teal-500 rounded-lg focus:outline-none focus:border-teal-600';
    input.oninput = function() {
        document.getElementById('continue-button').disabled = !this.value;
    };
    container.appendChild(input);
}

// Helper function to create text input
function createTextInput(container) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'mt-4 w-full max-w-md px-4 py-2 border-2 border-teal-500 rounded-lg focus:outline-none focus:border-teal-600';
    input.oninput = function() {
        document.getElementById('continue-button').disabled = !this.value.trim();
    };
    container.appendChild(input);
}

// Update the CSS for the loading avatar
const style = document.createElement('style');
style.textContent = `
    .loading-container {
        width: 120px;
        height: 120px;
        margin: 0 auto;
    }
    .loading-avatar {
        width: 100%;
        height: 100%;
        object-fit: contain;
        animation: bounce 2s infinite;
    }
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
`;
document.head.appendChild(style);

// Function to toggle the "Other" input field
function toggleOtherInput(button) {
    // Find the input container
    const inputContainer = button.nextElementSibling;
    if (!inputContainer) return;

    // Toggle visibility
    const isHidden = inputContainer.classList.contains('hidden');
    inputContainer.classList.toggle('hidden', !isHidden);
    
    // Focus the input if we're showing it
    if (!isHidden) {
        const input = inputContainer.querySelector('input');
        if (input) {
            input.focus();
        }
    }
}