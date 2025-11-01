"use client";
import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState("");

  // This function will call itself until the job is done
  const pollForJob = async (id: string) => {
    try {
      const response = await fetch(`/api/status/${id}`); // Call our new API
      const data = await response.json();

      if (data.status === "COMPLETED") {
        setStatus("Job complete!");
        // We get the summary from the result JSON
        setResult(data.result.summary);
      } else if (data.status === "FAILED") {
        setStatus("Job failed. Check worker logs.");
        setResult(data.result.error);
      } else {
        // Job is still 'PENDING' or 'PROCESSING'
        setStatus("Job is processing... Please wait.");
        // Wait 3 seconds and poll again
        setTimeout(() => pollForJob(id), 3000);
      }
    } catch (error) {
      console.error("Error polling:", error);
      setStatus("Error polling for job status.");
    }
  };

  const handleSubmit = async () => {
    setStatus("Submitting...");
    setJobId("");
    setResult("");

    const response = await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text }),
    });

    const data = await response.json();

    if (response.ok) {
      setStatus("Job created! Waiting for worker...");
      setJobId(data.jobId);
      //Calls after we have the job ID
      pollForJob(data.jobId);
      // --------------------
    } else {
      setStatus(`Error: ${data.error}`);
    }
  };

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Aegis Support Co-pilot</h1>
      <textarea
        rows={10}
        cols={50}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a long customer email here..."
        style={{ display: "block", margin: "1rem 0", color: "black" }}
      />
      <button onClick={handleSubmit}>Triage Ticket</button>

      {status && (
        <p>
          <strong>Status:</strong> {status}
        </p>
      )}
      {jobId && (
        <p>
          <strong>Job ID:</strong> {jobId}
        </p>
      )}

      {/* This will now show the summary! */}
      {result && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Summary:</h3>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "1rem",
              borderRadius: "5px",
              color: "black",
            }}
          >
            {result}
          </pre>
        </div>
      )}
    </main>
  );
}
