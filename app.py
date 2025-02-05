from flask import Flask, render_template, jsonify, request
from celery import Celery
import time
from transformers import GPTNeoForCausalLM, GPT2Tokenizer

app = Flask(__name__)

# Update the broker and backend URLs to connect to the Redis container
app.config['CELERY_BROKER_URL'] = 'redis://redis:6379/0'  # Change this to your broker URL
app.config['CELERY_RESULT_BACKEND'] = 'redis://redis:6379/0'  # Change this to your backend URL
celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)

# Load GPT-Neo model and tokenizer for prompt enhancement
model_name = "EleutherAI/gpt-neo-2.7B"
model = GPTNeoForCausalLM.from_pretrained(model_name)  # Changed to GPT-Neo model
tokenizer = GPT2Tokenizer.from_pretrained(model_name)

@celery.task(bind=True)
def enhance_prompt(self, prompt):
    total_steps = 10
    for i in range(total_steps):
        time.sleep(1)  # Simulate work
        self.update_state(state='PROGRESS', meta={'current': i + 1, 'total': total_steps})
    
    # Enhance the prompt using GPT-Neo
    inputs = tokenizer(prompt, return_tensors="pt")
    outputs = model.generate(inputs['input_ids'], max_length=150, num_return_sequences=1)
    enhanced_prompt = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    return {'status': 'Task completed!', 'enhanced_prompt': enhanced_prompt}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start-task', methods=['POST'])
def start_task():
    data = request.get_json()
    prompt = data.get('prompt')

    # Validate the prompt
    if not prompt:
        return jsonify({'error': 'Prompt is required!'}), 400

    # Start the task
    task = enhance_prompt.apply_async(args=[prompt])
    return jsonify({'task_id': task.id})

@app.route('/task-status/<task_id>')
def task_status(task_id):
    task = enhance_prompt.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'current': 0,
            'total': 10,
            'status': 'Pending...'
        }
    elif task.state != 'FAILURE':
        response = {
            'state': task.state,
            'current': task.info.get('current', 0),
            'total': task.info.get('total', 10),
            'status': task.info.get('status', ''),
            'enhanced_prompt': task.info.get('enhanced_prompt', '')
        }
    else:
        response = {
            'state': task.state,
            'current': 0,
            'total': 0,
            'status': str(task.info),  # Exception raised
        }
    return jsonify(response)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001, debug=True)


