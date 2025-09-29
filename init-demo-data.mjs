/**
 * Demo Data Initialization Script
 * Creates comprehensive sample event data for development and testing
 */

import { EventRepository, TopicRepository, UserRepository, VoteRepository } from './src/lib/storage/index.ts';

async function initializeDemoData() {
  console.log('🚀 Initializing comprehensive demo data...\n');

  try {
    // Initialize repositories
    const eventRepo = new EventRepository({
      dataDir: './data',
      enableBackups: true,
      backupRetention: 10
    });

    const topicRepo = new TopicRepository({
      dataDir: './data',
      enableBackups: true,
      backupRetention: 10
    });

    const userRepo = new UserRepository({
      dataDir: './data',
      enableBackups: true,
      backupRetention: 10
    });

    const voteRepo = new VoteRepository({
      dataDir: './data',
      enableBackups: true,
      backupRetention: 10
    });

    // Create multiple demo users (organizer, participants, and guests)
    console.log('👤 Creating demo users...');
    const demoUsers = [
      {
        name: 'Sarah Chen',
        email: 'sarah.chen@demo.com',
        role: 'organizer',
        isGuest: false,
        lastActiveAt: new Date(),
        preferences: {
          language: 'en',
          notifications: true,
          theme: 'light',
          soundEnabled: true
        }
      },
      {
        name: 'Alex Rodriguez',
        email: 'alex.rodriguez@demo.com',
        role: 'participant',
        isGuest: false,
        lastActiveAt: new Date(),
        preferences: {
          language: 'en',
          notifications: true,
          theme: 'dark',
          soundEnabled: false
        }
      },
      {
        name: 'Demo Guest',
        role: 'guest',
        isGuest: true,
        lastActiveAt: new Date()
      }
    ];

    const createdUsers = [];
    for (const userData of demoUsers) {
      const userResult = await userRepo.create(userData);
      if (userResult.success) {
        console.log(`✅ Created user: ${userResult.data.name} (${userResult.data.role})`);
        createdUsers.push(userResult.data);
      } else {
        console.log(`⚠️  User ${userData.name} may already exist`);
        // Try to find existing user by email or name
        const existingResult = userData.email
          ? await userRepo.findBy({ email: userData.email })
          : await userRepo.findBy({ name: userData.name });
        if (existingResult.success && existingResult.data.length > 0) {
          createdUsers.push(existingResult.data[0]);
        }
      }
    }

    const organizerUser = createdUsers.find(u => u.role === 'organizer') || createdUsers[0];

    // Create comprehensive demo event
    console.log('\n🎪 Creating demo event...');
    const demoEvent = {
      title: 'Tech Innovation Unconference 2024',
      description: 'A collaborative space for technologists, entrepreneurs, and innovators to share ideas, discuss emerging trends, and build connections. Join us for an engaging day of learning and networking!',
      status: 'active',
      organizerId: organizerUser.id,
      maxParticipants: 100,
      accessCode: 'DEMO2024',
      qrCode: undefined,
      startTime: new Date(),
      endTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      currentActivity: 'voting',
      settings: {
        allowGuestAccess: true,
        requireRegistration: false,
        enableVoting: true,
        enableGroupIntelligence: true,
        enableDiscussionGroups: true,
        enableTeamDistribution: true,
        votingTimeLimit: 300,
        maxVotesPerTopic: 1,
        maxTopicsPerUser: 5,
        autoAdvanceActivities: false
      },
      metadata: {
        isDemo: true,
        participantCount: createdUsers.length
      }
    };

    const eventResult = await eventRepo.create(demoEvent);
    let eventId;

    if (!eventResult.success) {
      console.log('⚠️  Demo event may already exist, trying to find existing...');
      const existingEvent = await eventRepo.findByAccessCode('DEMO2024');
      if (existingEvent.success) {
        eventId = existingEvent.data.id;
        console.log(`🔍 Found existing demo event: "${existingEvent.data.title}" (ID: ${eventId})`);
      } else {
        eventId = 'demo-event-001'; // fallback ID
      }
    } else {
      eventId = eventResult.data.id;
      console.log(`✅ Created demo event: "${eventResult.data.title}" (ID: ${eventId})`);
      console.log(`🔑 Access Code: ${eventResult.data.accessCode}`);
    }

    // Create comprehensive sample topics
    console.log('\n📝 Creating sample topics...');
    const sampleTopics = [
      {
        title: 'AI Ethics and Responsible Development',
        description: 'Discussing the ethical implications of AI development and how we can build responsible AI systems that benefit society. What frameworks and practices should we adopt?',
        tags: ['ai', 'ethics', 'responsibility']
      },
      {
        title: 'Sustainable Tech: Green Computing Practices',
        description: 'Exploring ways to reduce the environmental impact of technology through green computing, efficient algorithms, and sustainable hardware practices.',
        tags: ['sustainability', 'environment', 'green-tech']
      },
      {
        title: 'Remote Work: Tools and Culture Evolution',
        description: 'Best practices for remote work collaboration, tools that enhance productivity, and building strong team culture in distributed organizations.',
        tags: ['remote-work', 'collaboration', 'culture']
      },
      {
        title: 'Blockchain Beyond Cryptocurrency',
        description: 'Real-world applications of blockchain technology beyond financial systems - supply chain, identity verification, smart contracts, and decentralized governance.',
        tags: ['blockchain', 'innovation', 'decentralization']
      },
      {
        title: 'Mental Health in Tech Workplaces',
        description: 'Addressing burnout, stress management, and creating supportive environments for mental health in technology companies and startups.',
        tags: ['mental-health', 'workplace', 'wellbeing']
      },
      {
        title: 'Web3 and Decentralized Internet',
        description: 'Exploring the potential of Web3 technologies, decentralized applications, and how they might reshape internet infrastructure.',
        tags: ['web3', 'decentralization', 'internet']
      },
      {
        title: 'Accessibility-First Product Design',
        description: 'Building products with accessibility at the core, not as an afterthought. Tools, techniques, and business case for inclusive design.',
        tags: ['accessibility', 'design', 'inclusion']
      },
      {
        title: 'The Future of Programming Languages',
        description: 'Emerging programming languages and paradigms. What will the next generation of developers be coding in?',
        tags: ['programming', 'languages', 'future']
      }
    ];

    const createdTopics = [];
    let topicsCreated = 0;
    for (let i = 0; i < sampleTopics.length; i++) {
      const topicData = sampleTopics[i];
      const submitter = createdUsers[i % createdUsers.length]; // Rotate through users

      const topic = {
        ...topicData,
        eventId: eventId,
        submittedBy: submitter.id,
        status: 'active',
        voteCount: 0,
        totalVoteWeight: 0,
        averageWeight: 0,
        lastVotedAt: undefined
      };

      const topicResult = await topicRepo.create(topic);
      if (topicResult.success) {
        console.log(`✅ Created topic: "${topicResult.data.title}"`);
        createdTopics.push(topicResult.data);
        topicsCreated++;
      } else {
        console.log(`⚠️  Topic "${topic.title}" may already exist`);
        // Try to find existing topic
        const existingResult = await topicRepo.findBy({ title: topic.title, eventId });
        if (existingResult.success && existingResult.data.length > 0) {
          createdTopics.push(existingResult.data[0]);
        }
      }
    }

    // Create sample votes to demonstrate the weighted voting system
    console.log('\n🗳️ Creating sample votes...');
    const voteWeights = ['first', 'second', 'third'];
    let votesCreated = 0;

    for (const user of createdUsers.slice(0, 2)) { // Only create votes for first 2 users
      const userTopics = createdTopics.slice(0, 3); // Vote on first 3 topics

      for (let i = 0; i < userTopics.length && i < 3; i++) {
        const weight = voteWeights[i];
        const vote = {
          userId: user.id,
          topicId: userTopics[i].id,
          eventId: eventId,
          weight: weight,
          timestamp: new Date(),
          isActive: true
        };

        const voteResult = await voteRepo.create(vote);
        if (voteResult.success) {
          console.log(`✅ ${user.name} voted "${weight}" for "${userTopics[i].title}"`);
          votesCreated++;

          // Update topic vote statistics
          const topic = userTopics[i];
          const weightValue = weight === 'first' ? 3 : weight === 'second' ? 2 : 1;
          const updatedTopic = {
            voteCount: topic.voteCount + 1,
            totalVoteWeight: topic.totalVoteWeight + weightValue,
            averageWeight: (topic.totalVoteWeight + weightValue) / (topic.voteCount + 1),
            lastVotedAt: new Date()
          };

          await topicRepo.update(topic.id, updatedTopic);
        }
      }
    }

    console.log(`\n🎉 Demo data initialization complete!`);
    console.log(`📊 Summary:`);
    console.log(`   • Users created: ${createdUsers.length}`);
    console.log(`   • Event: "${demoEvent.title}"`);
    console.log(`   • Topics created: ${topicsCreated}/${sampleTopics.length}`);
    console.log(`   • Sample votes: ${votesCreated}`);
    console.log(`   • Access code: ${demoEvent.accessCode}`);
    console.log(`   • Event ID: ${eventId}`);
    console.log('\n🚀 Ready to test the unconference platform!');
    console.log('🗳️ Weighted Voting System:');
    console.log('   • 1st Choice: 🥇 3 points');
    console.log('   • 2nd Choice: 🥈 2 points');
    console.log('   • 3rd Choice: 🥉 1 point');
    console.log('');
    console.log('🔗 To join the demo event, use access code: DEMO2024');

  } catch (error) {
    console.error('❌ Failed to initialize demo data:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDemoData();