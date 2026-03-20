declare module "express-session" {
    export interface SessionData {
        username: string | null;
        password: string | null;
    }
}

