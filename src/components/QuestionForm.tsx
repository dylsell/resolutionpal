import { useState } from 'react';
import { Box, Button, Stack, Textarea, Heading } from '@chakra-ui/react';
import { UserResponses } from '../types';

interface QuestionFormProps {
  onSubmit: (responses: UserResponses) => void;
}

export const QuestionForm = ({ onSubmit }: QuestionFormProps) => {
  const [responses, setResponses] = useState<UserResponses>({
    goals: '',
    challenges: '',
    timeCommitment: '',
    previousExperience: '',
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(responses);
  };

  return (
    <Box 
      as="form" 
      onSubmit={handleSubmit} 
      width="100%" 
      maxW="600px"
      bg="white"
      p={8}
      borderRadius="xl"
      boxShadow="md"
      borderTop="4px solid"
      borderColor="brand.primary"
    >
      <Stack spacing={6}>
        <Heading size="lg" color="brand.secondary" mb={4}>Set Your New Year's Resolutions</Heading>
        
        <Box>
          <Heading size="sm" mb={2} color="brand.primary">What are your main goals for the new year?</Heading>
          <Textarea
            value={responses.goals}
            onChange={(e) => setResponses({ ...responses, goals: e.target.value })}
            placeholder="E.g., Improve fitness, learn a new language..."
            borderColor="gray.300"
            _hover={{ borderColor: 'brand.primary' }}
            _focus={{ borderColor: 'brand.primary', boxShadow: '0 0 0 1px #00CFF8' }}
          />
        </Box>

        <Box>
          <Heading size="sm" mb={2} color="brand.primary">What challenges do you anticipate?</Heading>
          <Textarea
            value={responses.challenges}
            onChange={(e) => setResponses({ ...responses, challenges: e.target.value })}
            placeholder="E.g., Limited time, motivation..."
            borderColor="gray.300"
            _hover={{ borderColor: 'brand.primary' }}
            _focus={{ borderColor: 'brand.primary', boxShadow: '0 0 0 1px #00CFF8' }}
          />
        </Box>

        <Box>
          <Heading size="sm" mb={2} color="brand.primary">How much time can you commit weekly?</Heading>
          <Textarea
            value={responses.timeCommitment}
            onChange={(e) => setResponses({ ...responses, timeCommitment: e.target.value })}
            placeholder="E.g., 3 hours per week..."
            borderColor="gray.300"
            _hover={{ borderColor: 'brand.primary' }}
            _focus={{ borderColor: 'brand.primary', boxShadow: '0 0 0 1px #00CFF8' }}
          />
        </Box>

        <Box>
          <Heading size="sm" mb={2} color="brand.primary">Any previous experience with these goals?</Heading>
          <Textarea
            value={responses.previousExperience}
            onChange={(e) => setResponses({ ...responses, previousExperience: e.target.value })}
            placeholder="E.g., Tried learning Spanish last year..."
            borderColor="gray.300"
            _hover={{ borderColor: 'brand.primary' }}
            _focus={{ borderColor: 'brand.primary', boxShadow: '0 0 0 1px #00CFF8' }}
          />
        </Box>

        <Button 
          type="submit" 
          size="lg"
          variant="primary"
          mt={4}
        >
          Generate Resolutions
        </Button>
      </Stack>
    </Box>
  );
}; 