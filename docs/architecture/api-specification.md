# API Specification

## REST API Specification

```yaml
openapi: 3.0.0
info:
  title: TPN Dynamic Text Editor API
  version: 1.0.0
  description: REST API for AI test generation and future enhancements
servers:
  - url: https://tpn-editor.vercel.app/api
    description: Production server
  - url: http://localhost:5173/api
    description: Local development

paths:
  /generate-tests:
    post:
      summary: Generate test cases using AI
      description: Analyzes dynamic JavaScript code and generates comprehensive test cases
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - code
                - sectionName
              properties:
                code:
                  type: string
                  description: JavaScript code to analyze
                sectionName:
                  type: string
                  description: Name of the section for context
                context:
                  type: object
                  description: Optional TPN context for test generation
                  properties:
                    populationType:
                      type: string
                      enum: [adult, pediatric, neonatal]
                    availableVariables:
                      type: array
                      items:
                        type: string
            example:
              code: "return me.getValue('weight') * 2;"
              sectionName: "Weight Calculation"
              context:
                populationType: "adult"
                availableVariables: ["weight", "height", "age"]
      responses:
        '200':
          description: Successfully generated test cases
          content:
            application/json:
              schema:
                type: object
                properties:
                  testCases:
                    type: array
                    items:
                      type: object
                      properties:
                        name:
                          type: string
                        variables:
                          type: object
                        expectedOutput:
                          type: string
                        description:
                          type: string
              example:
                testCases:
                  - name: "Standard adult weight"
                    variables:
                      weight: 70
                    expectedOutput: "140"
                    description: "Tests normal adult weight calculation"
                  - name: "Edge case - minimum weight"
                    variables:
                      weight: 1
                    expectedOutput: "2"
                    description: "Tests boundary condition"
        '400':
          description: Invalid request
        '500':
          description: Server error or AI service unavailable

  /health:
    get:
      summary: Health check endpoint
      description: Verifies API availability
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [healthy]
                  timestamp:
                    type: string
                    format: date-time

components:
  securitySchemes:
    firebaseAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Firebase ID token for authenticated requests

  headers:
    X-Request-ID:
      description: Unique request identifier for tracing
      schema:
        type: string
        format: uuid
```

## Firebase Firestore Operations

While not a traditional REST API, the application uses Firebase SDK for data operations:

**Collections:**
- `references/{referenceId}` - Reference documents
- `users/{userId}/references/{referenceId}` - User-specific references

**Operations:**
- `create()` - Save new reference configuration
- `update()` - Modify existing reference
- `get()` - Retrieve reference by ID
- `list()` - Query user's references
- `delete()` - Remove reference
- `onSnapshot()` - Real-time updates subscription
