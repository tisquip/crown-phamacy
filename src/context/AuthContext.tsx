import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useConvexAuth, useConvex } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";

export interface AuthDetails {
  client: Doc<"users"> | null;
  userProfile: Doc<"userProfile"> | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  wishlistProductIds: Array<Id<"products">>;
  isInWishlist: (productId: Id<"products">) => boolean;
  addToWishlist: (productId: Id<"products">) => void;
  removeFromWishlist: (productId: Id<"products">) => void;
}

const AuthContext = createContext<AuthDetails | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoading: convexIsLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const convex = useConvex();

  const [userQueryResult, setUserQueryResult] = useState<
    | {
        user: Doc<"users"> | null;
        userProfile: Doc<"userProfile"> | null;
      }
    | null
    | undefined
  >(undefined);

  const [wishlistIds, setWishlistIds] = useState<Array<Id<"products">>>([]);

  // Fetch user data once when auth state settles
  useEffect(() => {
    if (convexIsLoading) return;
    if (!isAuthenticated) {
      setUserQueryResult(null);
      return;
    }
    convex
      .query(api.userFns.userProfile.getLoggedInUser)
      .then(setUserQueryResult);
  }, [convex, isAuthenticated, convexIsLoading]);

  // Fetch wishlist once when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setWishlistIds([]);
      return;
    }
    convex.query(api.userFns.wishlist.getWishlist).then(setWishlistIds);
  }, [convex, isAuthenticated]);

  // Extract user and userProfile from query result
  const client = userQueryResult?.user || null;
  const userProfile = userQueryResult?.userProfile || null;

  // Calculate loading state properly
  const isDataLoading =
    convexIsLoading || (isAuthenticated && userQueryResult === undefined);
  const isLoggedIn = isAuthenticated && !!client;

  // If user exists but no profile, create one
  useEffect(() => {
    const createProfileIfNeeded = async () => {
      if (isAuthenticated && client && !userProfile && !isDataLoading) {
        try {
          await convex.mutation(
            api.userFns.userProfile.addUserProfileForLoggedInUser,
          );
          const result = await convex.query(
            api.userFns.userProfile.getLoggedInUser,
          );
          setUserQueryResult(result);
        } catch (error) {
          console.error("Failed to create user profile:", error);
        }
      }
    };

    createProfileIfNeeded();
  }, [isAuthenticated, client, userProfile, isDataLoading, convex]);

  const loginEmail = async (email: string, password: string): Promise<void> => {
    try {
      await signIn("email", {
        email,
        password,
        redirectTo: "/?redirect=account",
      });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const loginGoogle = async (): Promise<void> => {
    try {
      await signIn("google", { redirectTo: "/?redirect=account" });
    } catch (error) {
      console.error("Google login failed:", error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  // Wishlist functionality - backed by Convex
  const isInWishlist = (productId: Id<"products">): boolean => {
    return wishlistIds.includes(productId);
  };

  const addToWishlist = (productId: Id<"products">): void => {
    if (!isAuthenticated) return;
    setWishlistIds((prev) => [...prev, productId]);
    void convex
      .mutation(api.userFns.wishlist.addToWishlist, { productId })
      .catch(() => {
        setWishlistIds((prev) => prev.filter((id) => id !== productId));
      });
  };

  const removeFromWishlist = (productId: Id<"products">): void => {
    if (!isAuthenticated) return;
    setWishlistIds((prev) => prev.filter((id) => id !== productId));
    void convex
      .mutation(api.userFns.wishlist.removeFromWishlist, { productId })
      .catch(() => {
        setWishlistIds((prev) => [...prev, productId]);
      });
  };

  const contextValue: AuthDetails = {
    client,
    userProfile,
    isLoading: isDataLoading,
    isLoggedIn,
    loginEmail,
    loginGoogle,
    logout,
    wishlistProductIds: wishlistIds,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
