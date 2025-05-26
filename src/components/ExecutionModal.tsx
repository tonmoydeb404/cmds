import { AlertCircle, CheckCircle, Monitor, X } from "lucide-react";
import React from "react";

interface ExecutionModalProps {
  results: [string, string][];
  onClose: () => void;
}

const ExecutionModal: React.FC<ExecutionModalProps> = ({
  results,
  onClose,
}) => {
  const getResultIcon = (output: string) => {
    if (
      output.toLowerCase().includes("error") ||
      output.toLowerCase().includes("failed")
    ) {
      return <AlertCircle size={16} style={{ color: "#ef4444" }} />;
    }
    return <CheckCircle size={16} style={{ color: "#10b981" }} />;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal execution-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            <Monitor size={20} />
            Execution Results ({results.length} command
            {results.length !== 1 ? "s" : ""})
          </h2>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body execution-results">
          {results.map(([name, output], index) => (
            <div key={index} className="execution-result">
              <h3>
                {getResultIcon(output)}
                {name}
              </h3>
              <pre className="output">{output}</pre>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Close Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionModal;
