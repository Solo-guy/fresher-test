import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { UserModel } from '../models/User';
import { WalletModel } from '../models/Wallet';

const oauthClient = new OAuth2Client(env.googleClientId);

export const loginOrRegisterWithGoogle = async (idToken: string, tenantId: string) => {
  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || !payload.name) {
    throw new AppError('Token Google không hợp lệ', 401);
  }

  let user = await UserModel.findOne({ googleId: payload.sub, tenantId });
  if (!user) {
    user = await UserModel.create({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
      tenantId,
    });
  } else {
    let shouldSave = false;
    if (payload.picture && user.avatar !== payload.picture) {
      user.avatar = payload.picture;
      shouldSave = true;
    }
    if (user.name !== payload.name) {
      user.name = payload.name;
      shouldSave = true;
    }
    if (user.email !== payload.email) {
      user.email = payload.email;
      shouldSave = true;
    }
    if (shouldSave) {
      await user.save();
    }
  }

  const walletExists = await WalletModel.exists({ user: user._id, tenantId });
  if (!walletExists) {
    await WalletModel.create({
      user: user._id,
      name: 'Ví chính',
      initialBalance: 0,
      balance: 0,
      openedAt: new Date(),
      tenantId,
    });
  }

  return user;
};


