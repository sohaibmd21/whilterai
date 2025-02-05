document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('submit-btn').addEventListener('click', async () => {
        const prompt = document.getElementById('prompt').value;
        const errorMessage = document.getElementById('error-message');
        const responseDiv = document.getElementById('response');
        const refreshBtn = document.getElementById('refresh-btn');
        const progressContainer = document.getElementById('progress-container');
        const outputHeading = document.getElementById('output-heading');
        const submitBtn = document.getElementById('submit-btn');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const loadingSpinner = document.getElementById('loading-spinner');

        // Clear previous messages
        errorMessage.textContent = '';
        responseDiv.textContent = '';
        refreshBtn.style.display = 'none';
        outputHeading.style.display = 'none';
        progressContainer.style.display = 'none';
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
        loadingSpinner.style.display = 'none';

        // Validate prompt input
        if (!prompt) {
            errorMessage.textContent = 'Please provide a prompt.';
            return;
        }

        // Change button text and show loading spinner
        submitBtn.textContent = 'Generating, please wait...';
        loadingSpinner.style.display = 'inline-block';
        progressContainer.style.display = 'block';

        try {
            // Start the task
            const response = await fetch('/start-task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();
            const taskId = data.task_id;

            // Poll for task status
            const interval = setInterval(async () => {
                const statusResponse = await fetch(`/task-status/${taskId}`);
                const statusData = await statusResponse.json();

                // Update progress bar
                const current = statusData.current;
                const total = statusData.total;
                const percentage = (current / total) * 100;

                progressFill.style.width = `${percentage}%`;
                progressText.textContent = `${Math.round(percentage)}%`;

                // Check if the task is complete
                if (statusData.state === 'SUCCESS') {
                    clearInterval(interval);
                    responseDiv.textContent = statusData.enhanced_prompt;  // Show the enhanced prompt
                    outputHeading.style.display = 'block'; // Show the output heading
                    refreshBtn.style.display = 'inline-block'; // Show refresh button
                } else if (statusData.state === 'FAILURE') {
                    clearInterval(interval);
                    errorMessage.textContent = 'There was an issue with the task.';
                }
            }, 1000); // Check every second
        } catch (error) {
            errorMessage.textContent = 'There was an issue generating the response. Please try again.';
        } finally {
            // Reset button text and hide loading spinner
            submitBtn.textContent = 'Generate Response';
            loadingSpinner.style.display = 'none';
            progressContainer.style.display = 'none';
            progressFill.style.width = '0%';
            progressText.textContent = '0%';
        }
    });

    // Refresh button functionality
    document.getElementById('refresh-btn').addEventListener('click', () => {
        const responseDiv = document.getElementById('response');
        if (responseDiv.textContent) {
            responseDiv.textContent = ''; // Clear the previous response
        }
        // Optionally, you can keep the prompt in the input field or clear it
        // document.getElementById('prompt').value = ''; // Uncomment to clear the input
    });
});

