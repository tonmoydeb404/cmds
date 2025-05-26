import { X } from "lucide-react";
import React from "react";

interface ExecutionModalProps {
  results: [string, string][];
  onClose: () => void;
}

const ExecutionModal: React.FC<ExecutionModalProps> = ({
  results,
  onClose,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal execution-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Execution Results</h2>
          <button className="btn btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body execution-results">
          {results.map(([name, output], index) => (
            <div key={index} className="execution-result">
              <h3>{name}</h3>
              <pre className="output">{output}</pre>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionModal;
