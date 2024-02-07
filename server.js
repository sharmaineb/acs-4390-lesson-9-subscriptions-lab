const { ApolloServer, gql, PubSub } = require('apollo-server');

// Data Store
const data = {
  Main: [{ message: 'hello world', date: new Date() }],
  Cats: [{ message: 'Meow', date: new Date() }],
};

// PubSub for handling subscriptions
const pubsub = new PubSub();

// GraphQL Schema
const typeDefs = gql`
  type Post {
    message: String!
    date: String!
  }

  type Channel {
    name: String!
    posts: [Post!]!
  }

  type Query {
    posts(channel: String!): [Post!]
    channels: [Channel!]!
  }

  type Mutation {
    addPost(channel: String!, message: String!): Post
    addChannel(name: String!): Channel
  }

  type Subscription {
    newPost(channel: String!): Post
    newChannel: Channel!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    posts: (_, { channel }) => data[channel] || [],
    channels: () => Object.keys(data).map((name) => ({ name, posts: data[name] })),
  },
  Mutation: {
    addPost: (_, { channel, message }) => {
      const newPost = { message, date: new Date() };
      data[channel] = data[channel] ? [...data[channel], newPost] : [newPost];
      pubsub.publish('NEW_POST', { newPost, channel });
      return newPost;
    },
    addChannel: (_, { name }) => {
      const newChannel = { name, posts: [] };
      data[name] = [];
      pubsub.publish('NEW_CHANNEL', { newChannel });
      return newChannel;
    },
  },
  Subscription: {
    newPost: {
      subscribe: (_, { channel }) => pubsub.asyncIterator([`NEW_POST_${channel}`]),
    },
    newChannel: {
      subscribe: () => pubsub.asyncIterator(['NEW_CHANNEL']),
    },
  },
  Channel: {
    name: (parent) => parent.name,
    posts: (parent) => parent.posts,
  },
  Post: {
    message: (parent) => parent.message,
    date: (parent) => new Date(parent.date).toLocaleDateString(),
  },
};

// Apollo Server
const server = new ApolloServer({ typeDefs, resolvers });

// Start the server
server.listen().then(({ url }) => {
  console.log(`Server running at ${url}`);
});

// example usage

// Query for all channels
// query GetAllChannels {
//   channels {
//     name
//     posts {
//       message
//       date
//     }
//   }
// }

// Query for posts in a specific channel
// query GetPostsInChannel {
//   posts(channel: "Main") {
//     message
//     date
//   }
// }

// Mutation to add a post
// mutation AddPost {
//   addPost(channel: "Main", message: "This is a new post!") {
//     message
//     date
//   }
// }

// Mutation to add a channel
// mutation AddChannel {
//   addChannel(name: "Tech") {
//     name
//   }
// }

// Subscription for new posts in a specific channel
// subscription NewPostSubscription {
//   newPost(channel: "Main") {
//     message
//     date
//   }
// }

// Subscription for new channels
// subscription NewChannelSubscription {
//   newChannel {
//     name
//   }
// }
