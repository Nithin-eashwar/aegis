import os
from dotenv import load_dotenv
import time
from supabase import create_client, Client

from transformers import pipeline

try:
    print("Loading summarization model...")
    summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    summarizer = None

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
print("Connection successful.")

def process_job(job):
    job_id = job['id']
    print(f"Found job {job_id}. Processing...")

    try:

        input_text = job['input_text']

        if not input_text:
            raise Exception("Job missing 'input_text' field.")
        
        if not summarizer:
            raise Exception("Summarization model is not loaded.")

        print(f"Summarizing text (length: {len(input_text)})...")

        summary = summarizer(input_text, max_length=130, min_length=30, do_sample=False)
        summary_text = summary[0]['summary_text']

        new_result = {"summary": summary_text}

        supabase.table('jobs').update({
            'status': 'completed',
            'result': new_result
        }).eq('id', job_id).execute()

        print(f"Job {job_id} completed successfully.")
    
    except Exception as e:
        print(f"Error processing job {job_id}: {e}")
        supabase.table('jobs').update({
            'status': 'failed',
            'result': {'error': str(e)}
        }).eq('id', job_id).execute()


def main():
    print("Worker started. Listening for jobs...")
    while True:
        try:
            response = supabase.table('jobs').select('*').eq('status', 'pending').order('created_at', desc=True).limit(1).single().execute()

            job = response.data
            if job:
                process_job(job)
            else:
                time.sleep(2)  # No pending jobs, wait before checking again
        except Exception as e:
            error_message = str(e)

            if "PGRTS116" in error_message or "The result contains 0 rows" in error_message:

                print("No pending jobs found. Waiting 5 seconds...")
                time.sleep(5)
                
            if "JSON object must be str, bytes or bytearray, not NoneType" in str(e):
                 print("No pending jobs found. Waiting 5 seconds...")
                 time.sleep(5)
            else:
                # A real error occurred
                print(f"An unexpected error occurred: {e}")
                time.sleep(10) # Wait longer if a real error happens

if __name__ == "__main__":
    main()
