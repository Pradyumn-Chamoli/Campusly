import { Router } from "express";
import {
  getConversation,
  listConversations,
  listMessages,
  sendMessage,
  startConversation,
} from "../controllers/conversationController.js";
import {
  conversationIdValidation,
  conversationParamValidation,
  listConversationsValidation,
  listMessagesValidation,
  sendMessageValidation,
  startConversationValidation,
} from "../validators/conversation.js";
import validate from "../middleware/validate.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.get("/", authenticate, listConversationsValidation, validate, listConversations);
router.post("/", authenticate, startConversationValidation, validate, startConversation);

router.get("/:id", authenticate, conversationParamValidation, validate, getConversation);
router.get(
  "/:conversationId/messages",
  authenticate,
  conversationIdValidation,
  listMessagesValidation,
  validate,
  listMessages
);
router.post(
  "/:conversationId/messages",
  authenticate,
  sendMessageValidation,
  validate,
  sendMessage
);

export default router;
