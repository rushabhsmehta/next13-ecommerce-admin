// Audit logger utility to consistently log changes to various entities
import { currentUser } from "@clerk/nextjs";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";
type UserRole = "ADMIN" | "ASSOCIATE";

interface AuditLogParams {
  entityId: string;
  entityType: string;
  action: AuditAction;
  before?: any;
  after?: any;
  metadata?: any;
  userRole: UserRole;
}

/**
 * Creates an audit log entry for an action performed on an entity
 */
export const createAuditLog = async (params: AuditLogParams): Promise<void> => {
  try {
    const user = await currentUser();
    
    if (!user) {
      console.error("Failed to create audit log: No authenticated user");
      return;
    }
    
    const userEmail = user.emailAddresses[0]?.emailAddress || "unknown";
    // Fix: `fullName` doesn't exist on Clerk User type, construct it from firstName and lastName
    const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || userEmail;    
    // Get the base URL for the API call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    // Make API call to create audit log with absolute URL
    const response = await fetch(`${baseUrl}/api/audit-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        userId: user.id,
        userEmail,
        userName,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to create audit log: ${error}`);
    }
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
};