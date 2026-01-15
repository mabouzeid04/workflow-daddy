// System prompts for Workflow Shadow
// This file will be expanded with interview and observation prompts later

function getSystemPrompt(mode = 'default', customContext = '') {
    // Placeholder system prompt - will be replaced with interview/observation prompts
    const basePrompt = `You are an AI assistant helping to document workflows.

${customContext ? `Context:\n${customContext}\n` : ''}

Please provide helpful and accurate responses.`;

    return basePrompt;
}

module.exports = {
    getSystemPrompt,
};
