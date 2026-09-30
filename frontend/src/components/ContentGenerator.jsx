import React, { useState, useRef } from "react";
import api from "../services/api";

/**
 * Intelligent helper to parse Gemini's output into structured sections:
 * 1. Caption
 * 2. Description
 * 3. Hashtags
 * 4. Call to Action
 */
const parseGeneratedContent = (text) => {
  if (!text || typeof text !== "string") return null;

  const lines = text.split("\n");
  let currentSection = null;
  const sections = {
    caption: [],
    description: [],
    hashtags: [],
    callToAction: []
  };

  const getSectionType = (line) => {
    // Strip bullet numbers, markdown asterisks, hashes, colons, dashes
    const clean = line
      .replace(/^[\s#*`\-_>]+/, "")
      .replace(/^\d+[\.\)]\s*/, "")
      .toLowerCase()
      .trim();

    if (clean.startsWith("caption") || clean.startsWith("catchy caption")) return "caption";
    if (clean.startsWith("description") || clean.startsWith("short description")) return "description";
    if (clean.startsWith("hashtag") || clean.startsWith("relevant hashtag")) return "hashtags";
    if (clean.startsWith("call to action") || clean.startsWith("cta")) return "callToAction";
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const detected = getSectionType(rawLine);

    if (detected) {
      currentSection = detected;
      const colonIdx = rawLine.indexOf(":");
      if (colonIdx !== -1) {
        const afterColon = rawLine.slice(colonIdx + 1).trim();
        const cleanedContent = afterColon.replace(/^[*_]+|[*_]+$/g, "").trim();
        if (cleanedContent) {
          sections[currentSection].push(cleanedContent);
        }
      }
    } else if (currentSection) {
      sections[currentSection].push(rawLine);
    }
  }

  const caption = sections.caption.join("\n").trim();
  const description = sections.description.join("\n").trim();
  const hashtags = sections.hashtags.join("\n").trim();
  const callToAction = sections.callToAction.join("\n").trim();

  const count = [caption, description, hashtags, callToAction].filter(Boolean).length;

  return {
    hasStructure: count >= 2,
    caption,
    description,
    hashtags,
    callToAction
  };
};

export default function ContentGenerator() {
  // Required React State variables
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("");
  const [tone, setTone] = useState("");
  const [language, setLanguage] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Additional UI feedback states
  const [copiedSection, setCopiedSection] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [activeTab, setActiveTab] = useState("structured"); // "structured" | "full"

  // Ref for auto-scrolling on mobile devices
  const resultRef = useRef(null);

  // Quick suggestion chips for great inspiration
  const sampleTopics = [
    "Artificial Intelligence",
    "Productivity Hacks",
    "Eco-Friendly Brand",
    "Monday Motivation",
    "Web Development"
  ];

  // Validate form inputs
  const validateForm = () => {
    const errors = {};
    if (!topic.trim()) {
      errors.topic = "Topic cannot be empty.";
    }
    if (!platform) {
      errors.platform = "Platform must be selected.";
    }
    if (!tone) {
      errors.tone = "Tone must be selected.";
    }
    if (!language) {
      errors.language = "Language must be selected.";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Content Generation handler
  const generateContent = async () => {
    if (!validateForm()) {
      setError("Please fill in all required fields before generating content.");
      return;
    }

    setError("");
    setLoading(true);

    // Smooth scroll to output card on mobile when generation starts
    if (window.innerWidth < 992) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }

    // Dynamic prompt creation matching specifications
    const prompt = `
Create social media content about "${topic}".

Platform: ${platform}
Tone: ${tone}
Language: ${language}

Generate:
1. Catchy caption
2. Short description
3. Relevant hashtags
4. Call to action

Make the content engaging, natural and suitable for the selected platform.
Do not include unnecessary explanations.
`;

    try {
      // Axios request to backend API
      const response = await api.post("/groq", {
        prompt
      });

      if (response?.data?.response) {
        setResult(response.data.response);
        setError("");

        // On mobile, ensure user is comfortably viewing results
        if (window.innerWidth < 992) {
          setTimeout(() => {
            resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
        }
      } else {
        setError("Unexpected response received from the server.");
      }
    } catch (err) {
      console.error("Content generation error:", err);
      const serverMessage =
        err?.response?.data?.message ||
        "Failed to generate content. Please make sure the backend is running and the Gemini API key is configured.";
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (textToCopy, sectionKey = "all") => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedSection(sectionKey);
      setTimeout(() => setCopiedSection(""), 2200);
    });
  };

  // Regenerate feature
  const handleRegenerate = () => {
    if (!loading && topic && platform && tone && language) {
      generateContent();
    }
  };

  // Clear feature
  const handleClear = () => {
    setTopic("");
    setPlatform("");
    setTone("");
    setLanguage("");
    setResult("");
    setError("");
    setValidationErrors({});
    setCopiedSection("");
  };

  // Parse result into structured cards or plain view
  const parsed = result ? parseGeneratedContent(result) : null;

  return (
    <div className="generator-container">
      {/* Header section */}
      <header className="app-header">
        <div className="header-badge">
          <span className="badge-sparkle">✨</span> Powered by Groq AI
        </div>
        <h1 className="header-title">AI Social Media Content Generator</h1>
        <p className="header-subtitle">Create engaging social media content with AI</p>
      </header>

      {/* Main Grid Layout: Form on Left, Output Preview on Right */}
      <div className="content-layout">
        {/* Left Column: Input Form Card */}
        <section className="form-card" aria-label="Content Generator Form">
          <div className="card-header">
            <div className="card-icon-title">
              <span className="icon-wrapper">🪄</span>
              <div>
                <h2>Content Preferences</h2>
                <p className="card-description">Configure your audience and post style</p>
              </div>
            </div>
            {(topic || platform || tone || language || result) && (
              <button
                type="button"
                className="btn-text-clear"
                onClick={handleClear}
                title="Reset all fields"
              >
                Clear All
              </button>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              generateContent();
            }}
            noValidate
          >
            {/* 1. Topic Input */}
            <div className={`form-group ${validationErrors.topic ? "has-error" : ""}`}>
              <label htmlFor="topic-input" className="form-label">
                Topic <span className="required-star">*</span>
              </label>
              <input
                id="topic-input"
                type="text"
                className="form-control"
                placeholder="e.g., Artificial Intelligence"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  if (validationErrors.topic) {
                    setValidationErrors((prev) => ({ ...prev, topic: null }));
                  }
                }}
                disabled={loading}
                autoComplete="off"
              />
              {validationErrors.topic && (
                <span className="field-error-message">{validationErrors.topic}</span>
              )}

              {/* Sample Topic Pills (Horizontally scrollable on mobile) */}
              <div className="sample-pills-container">
                <span className="pills-label">Ideas:</span>
                <div className="sample-pills-scroll">
                  {sampleTopics.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="topic-pill"
                      onClick={() => {
                        setTopic(sample);
                        if (validationErrors.topic) {
                          setValidationErrors((prev) => ({ ...prev, topic: null }));
                        }
                      }}
                      disabled={loading}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Platform Dropdown */}
            <div className={`form-group ${validationErrors.platform ? "has-error" : ""}`}>
              <label htmlFor="platform-select" className="form-label">
                Platform <span className="required-star">*</span>
              </label>
              <div className="select-wrapper">
                <select
                  id="platform-select"
                  className="form-control"
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value);
                    if (validationErrors.platform) {
                      setValidationErrors((prev) => ({ ...prev, platform: null }));
                    }
                  }}
                  disabled={loading}
                >
                  <option value="">Select Platform</option>
                  <option value="Instagram">Instagram</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Twitter/X">Twitter/X</option>
                </select>
                <span className="select-arrow">▼</span>
              </div>
              {validationErrors.platform && (
                <span className="field-error-message">{validationErrors.platform}</span>
              )}
            </div>

            {/* 3. Tone Dropdown */}
            <div className={`form-group ${validationErrors.tone ? "has-error" : ""}`}>
              <label htmlFor="tone-select" className="form-label">
                Tone <span className="required-star">*</span>
              </label>
              <div className="select-wrapper">
                <select
                  id="tone-select"
                  className="form-control"
                  value={tone}
                  onChange={(e) => {
                    setTone(e.target.value);
                    if (validationErrors.tone) {
                      setValidationErrors((prev) => ({ ...prev, tone: null }));
                    }
                  }}
                  disabled={loading}
                >
                  <option value="">Select Tone</option>
                  <option value="Professional">Professional</option>
                  <option value="Casual">Casual</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Funny">Funny</option>
                  <option value="Inspirational">Inspirational</option>
                  <option value="Promotional">Promotional</option>
                </select>
                <span className="select-arrow">▼</span>
              </div>
              {validationErrors.tone && (
                <span className="field-error-message">{validationErrors.tone}</span>
              )}
            </div>

            {/* 4. Language Dropdown */}
            <div className={`form-group ${validationErrors.language ? "has-error" : ""}`}>
              <label htmlFor="language-select" className="form-label">
                Language <span className="required-star">*</span>
              </label>
              <div className="select-wrapper">
                <select
                  id="language-select"
                  className="form-control"
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    if (validationErrors.language) {
                      setValidationErrors((prev) => ({ ...prev, language: null }));
                    }
                  }}
                  disabled={loading}
                >
                  <option value="">Select Language</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Marathi">Marathi</option>
                </select>
                <span className="select-arrow">▼</span>
              </div>
              {validationErrors.language && (
                <span className="field-error-message">{validationErrors.language}</span>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="error-banner" role="alert">
                <span className="error-icon">⚠️</span>
                <div className="error-text">
                  <strong>Notice:</strong> {error}
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="submit"
                id="generate-button"
                className={`btn-primary ${loading ? "btn-loading" : ""}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Generating Content...</span>
                  </>
                ) : (
                  <>
                    <span className="btn-icon">⚡</span>
                    <span>Generate Content</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Output / Result Section */}
        <section
          className="result-card-container"
          ref={resultRef}
          aria-label="Generated Content Result"
        >
          {/* Loading State Skeleton / Animation */}
          {loading && (
            <div className="result-card loading-state">
              <div className="loading-pulse-header">
                <div className="spinner-large"></div>
                <h3>Gemini AI is crafting your post...</h3>
                <p>Tailoring tone, hashtags, and call to action for {platform || "your platform"}</p>
              </div>
              <div className="skeleton-block skeleton-caption"></div>
              <div className="skeleton-block skeleton-desc"></div>
              <div className="skeleton-block skeleton-tags"></div>
              <div className="skeleton-block skeleton-cta"></div>
            </div>
          )}

          {/* Empty State when no result yet and not loading */}
          {!loading && !result && (
            <div className="result-card empty-state">
              <div className="empty-icon-bubble">💡</div>
              <h3>Ready to create high-performing content?</h3>
              <p>
                Fill in your topic, pick your social platform, choose a tone and language, then hit
                <strong> Generate Content</strong>.
              </p>

              <div className="empty-features-grid">
                <div className="feature-item">
                  <div className="feature-top">
                    <span className="feature-icon">📸</span>
                    <span className="feature-name">Instagram</span>
                  </div>
                  <span className="feature-desc">Visual hooks & aesthetic captions</span>
                </div>
                <div className="feature-item">
                  <div className="feature-top">
                    <span className="feature-icon">💼</span>
                    <span className="feature-name">LinkedIn</span>
                  </div>
                  <span className="feature-desc">Thought leadership & career value</span>
                </div>
                <div className="feature-item">
                  <div className="feature-top">
                    <span className="feature-icon">𝕏</span>
                    <span className="feature-name">Twitter/X</span>
                  </div>
                  <span className="feature-desc">Punchy thoughts & viral hooks</span>
                </div>
                <div className="feature-item">
                  <div className="feature-top">
                    <span className="feature-icon">👥</span>
                    <span className="feature-name">Facebook</span>
                  </div>
                  <span className="feature-desc">Community discussions & shares</span>
                </div>
              </div>
            </div>
          )}

          {/* Result Card when content has been generated */}
          {!loading && result && (
            <div className="result-card active-result">
              {/* Result Card Header */}
              <div className="result-card-header">
                <div className="result-meta">
                  <span className="meta-badge platform-badge">
                    {platform === "Instagram" && "📸"}
                    {platform === "LinkedIn" && "💼"}
                    {platform === "Facebook" && "👥"}
                    {platform === "Twitter/X" && "𝕏"}
                    {" "}{platform}
                  </span>
                  <span className="meta-badge tone-badge">🎭 {tone}</span>
                  <span className="meta-badge language-badge">🌐 {language}</span>
                </div>

                <div className="result-header-actions">
                  {/* View mode toggle */}
                  {parsed?.hasStructure && (
                    <div className="view-toggle">
                      <button
                        type="button"
                        className={`toggle-btn ${activeTab === "structured" ? "active" : ""}`}
                        onClick={() => setActiveTab("structured")}
                        title="Segmented visual sections"
                      >
                        Structured
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${activeTab === "full" ? "active" : ""}`}
                        onClick={() => setActiveTab("full")}
                        title="Full copyable text"
                      >
                        Full Post
                      </button>
                    </div>
                  )}

                  {/* Copy Button */}
                  <button
                    type="button"
                    id="copy-button"
                    className="btn-copy"
                    onClick={() => handleCopy(result, "all")}
                    title="Copy entire post to clipboard"
                  >
                    {copiedSection === "all" ? (
                      <>
                        <span className="check-icon">✓</span>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <span className="copy-icon">📋</span>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Result Content */}
              <div className="result-content-body">
                {/* Structured View */}
                {parsed?.hasStructure && activeTab === "structured" ? (
                  <div className="structured-sections">
                    {/* 1. Caption Section */}
                    {parsed.caption && (
                      <div className="result-section section-caption">
                        <div className="section-header">
                          <span className="section-label">
                            <span className="section-icon">✨</span>
                            <strong>Caption</strong>
                          </span>
                          <button
                            type="button"
                            className="btn-section-copy"
                            onClick={() => handleCopy(parsed.caption, "caption")}
                          >
                            {copiedSection === "caption" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <div className="section-content caption-text">{parsed.caption}</div>
                      </div>
                    )}

                    {/* 2. Description Section */}
                    {parsed.description && (
                      <div className="result-section section-description">
                        <div className="section-header">
                          <span className="section-label">
                            <span className="section-icon">📝</span>
                            <strong>Description</strong>
                          </span>
                          <button
                            type="button"
                            className="btn-section-copy"
                            onClick={() => handleCopy(parsed.description, "desc")}
                          >
                            {copiedSection === "desc" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <div className="section-content description-text">
                          {parsed.description}
                        </div>
                      </div>
                    )}

                    {/* 3. Hashtags Section */}
                    {parsed.hashtags && (
                      <div className="result-section section-hashtags">
                        <div className="section-header">
                          <span className="section-label">
                            <span className="section-icon">🏷️</span>
                            <strong>Hashtags</strong>
                          </span>
                          <button
                            type="button"
                            className="btn-section-copy"
                            onClick={() => handleCopy(parsed.hashtags, "hashtags")}
                          >
                            {copiedSection === "hashtags" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <div className="section-content hashtags-text">
                          {parsed.hashtags}
                        </div>
                      </div>
                    )}

                    {/* 4. Call to Action Section */}
                    {parsed.callToAction && (
                      <div className="result-section section-cta">
                        <div className="section-header">
                          <span className="section-label">
                            <span className="section-icon">🚀</span>
                            <strong>Call to Action</strong>
                          </span>
                          <button
                            type="button"
                            className="btn-section-copy"
                            onClick={() => handleCopy(parsed.callToAction, "cta")}
                          >
                            {copiedSection === "cta" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <div className="section-content cta-text">
                          {parsed.callToAction}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Plain or Full View Formatted Card */
                  <div className="raw-result-container">
                    <pre className="raw-result-text">{result}</pre>
                  </div>
                )}
              </div>

              {/* Bottom Actions: Regenerate & Clear */}
              <div className="result-footer-actions">
                <button
                  type="button"
                  id="regenerate-button"
                  className="btn-secondary btn-regenerate"
                  onClick={handleRegenerate}
                  disabled={loading}
                >
                  <span className="btn-icon">🔄</span>
                  <span>Regenerate</span>
                </button>

                <button
                  type="button"
                  id="clear-button"
                  className="btn-secondary btn-clear"
                  onClick={handleClear}
                >
                  <span className="btn-icon">🗑️</span>
                  <span>Clear</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
