# Contributing Guide

## Development Setup

1. Clone the repository
2. Set up local development environment (see DEPLOYMENT.md)
3. Install dependencies:
   - Backend: Maven 3.9+
   - Frontend: Node.js 18+ and npm

## Code Style

### Backend (Java/Spring Boot)
- Follow Java naming conventions
- Use Lombok for boilerplate code
- Write unit tests for services
- Use Spring Boot best practices

### Frontend (Angular)
- Follow Angular style guide
- Use TypeScript strict mode
- Write component tests
- Use Angular Material for UI components

### Python (Databricks)
- Follow PEP 8 style guide
- Add docstrings to functions
- Include error handling

## Git Workflow

1. Create a feature branch from `develop`
2. Make your changes
3. Write/update tests
4. Commit with descriptive messages
5. Push and create a pull request

## Testing

- Backend: `mvn test`
- Frontend: `npm test`
- Integration: Run docker-compose and test end-to-end

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Request review from maintainers
4. Address review comments
5. Merge after approval

