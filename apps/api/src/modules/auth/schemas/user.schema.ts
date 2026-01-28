import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import type { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User> & {
    comparePassword: (candidatePassword: string) => Promise<boolean>;
};

@Schema({ timestamps: true })
export class User {
    @Prop({
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20,
    })
    username!: string;

    @Prop({
        type: String,
        required: true,
        minlength: 4,
    })
    password!: string;

    @Prop({
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, '请输入有效的邮箱地址'],
    })
    email?: string;

    @Prop({
        type: Boolean,
        default: false,
    })
    emailVerified!: boolean;

    @Prop({ type: Date, default: null })
    lastOnline?: Date | null;

    @Prop({ type: String, default: null, trim: true })
    avatar?: string | null;

    @Prop({
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    })
    role!: 'user' | 'admin';

    @Prop({ type: Boolean, default: false })
    banned!: boolean;

    @Prop({ type: Date, default: null })
    bannedAt?: Date | null;

    @Prop({ type: String, default: null, trim: true })
    bannedReason?: string | null;

    createdAt!: Date;
    updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre<UserDocument>('save', async function (this: UserDocument) {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (this: UserDocument, candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password as string);
};
