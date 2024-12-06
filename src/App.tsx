import { useState } from 'react';
import { ChakraProvider, Container, Stack, Alert, AlertIcon } from '@chakra-ui/react';
import { QuestionForm } from './components/QuestionForm';
import { ResolutionDisplay } from './components/ResolutionDisplay';
import { generateResolutions } from './services/openai';
import { Resolution, UserResponses } from './types';
import { theme } from './theme';

function App() {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (responses: UserResponses) => {
    try {
      setError(null);
      const generatedResolutions = await generateResolutions(responses);
      setResolutions(generatedResolutions);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to generate resolutions. Please try again later.');
    }
  };

  return (
    <ChakraProvider theme={theme}>
      <Container py={8}>
        <Stack spacing={8} align="center">
          {resolutions.length === 0 ? (
            <>
              {error && (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
              <QuestionForm onSubmit={handleSubmit} />
            </>
          ) : (
            <ResolutionDisplay resolutions={resolutions} />
          )}
        </Stack>
      </Container>
    </ChakraProvider>
  );
}

export default App; 