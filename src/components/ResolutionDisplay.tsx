import { Box, Stack, Heading, Text, List, ListItem } from '@chakra-ui/react';
import { Resolution } from '../types';

interface ResolutionDisplayProps {
  resolutions: Resolution[];
}

export const ResolutionDisplay = ({ resolutions }: ResolutionDisplayProps) => {
  return (
    <Stack spacing={6} width="100%" maxW="600px">
      {resolutions.map((resolution, index) => (
        <Box 
          key={index} 
          p={6} 
          borderRadius="xl" 
          bg="white" 
          boxShadow="md"
          borderTop="4px solid"
          borderColor="brand.primary"
        >
          <Heading size="md" mb={3} color="brand.secondary">{resolution.category}</Heading>
          <Text mb={3} fontSize="lg">{resolution.description}</Text>
          <Text mb={3} color="brand.primary" fontWeight="bold">Timeframe: {resolution.timeframe}</Text>
          
          <Heading size="sm" mb={3} color="brand.accent">Milestones:</Heading>
          <List spacing={2}>
            {resolution.milestones.map((milestone, idx) => (
              <ListItem key={idx} fontSize="md">• {milestone}</ListItem>
            ))}
          </List>
        </Box>
      ))}
    </Stack>
  );
}; 