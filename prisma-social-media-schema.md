// Add to your Prisma schema.prisma file

model SocialMediaConnection {
  id          String   @id @default(cuid())
  userId      String
  platform    String   // 'instagram', 'twitter', 'linkedin', 'facebook', etc.
  accountName String?  // Display name or username
  accountId   String?  // Platform-specific user/page ID
  accessToken String   // Encrypted access token
  refreshToken String? // For platforms that support refresh tokens
  tokenExpiresAt DateTime? // When the token expires
  isActive    Boolean  @default(true)
  lastSync    DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, platform])
  @@index([userId])
  @@index([platform])
  @@map("social_media_connections")
}

// You may also want to track posts across platforms
model SocialMediaPost {
  id            String   @id @default(cuid())
  userId        String
  imageId       String?  // Reference to AI generated image
  platform      String
  platformPostId String? // ID from the social media platform
  content       String
  scheduledFor  DateTime?
  postedAt      DateTime?
  status        String   @default("draft") // draft, scheduled, posted, failed
  metrics       Json?    // Store engagement metrics as JSON
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  image         AiGeneratedImage? @relation(fields: [imageId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([platform])
  @@index([status])
  @@map("social_media_posts")
}

// Also add this field to your existing AiGeneratedImage model
model AiGeneratedImage {
  // ...existing fields...
  
  // Social media posts relation
  socialMediaPosts SocialMediaPost[]
  
  // ...rest of model...
}
