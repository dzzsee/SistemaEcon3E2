import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { cn } from '../utils/cn.js';

export { Text };

export function Background({ children }) {
  return (
    <View className="flex-1 bg-slate-950">
      <LinearGradient
        colors={['#020617', '#03171a', '#020617']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -140,
          right: -120,
          width: 340,
          height: 340,
          borderRadius: 999,
          backgroundColor: 'rgba(5,150,105,0.13)'
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -160,
          left: -120,
          width: 340,
          height: 340,
          borderRadius: 999,
          backgroundColor: 'rgba(13,148,136,0.1)'
        }}
      />
      {children}
    </View>
  );
}

export function Screen({ children, className, refreshControl, contentContainerStyle }) {
  return (
    <Background>
      <ScrollView
        className={cn('flex-1', className)}
        contentContainerStyle={[{ padding: 16, paddingBottom: 40 }, contentContainerStyle]}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </Background>
  );
}

export function Card({ children, className, intensity = 18 }) {
  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      className={cn('overflow-hidden rounded-2xl border border-white/10 bg-white/5', className)}
    >
      {children}
    </BlurView>
  );
}

export function SectionTitle({ children, right, className }) {
  return (
    <View className={cn('mb-3 flex-row items-center justify-between', className)}>
      {typeof children === 'string' ? (
        <Text className="text-base font-semibold text-white">{children}</Text>
      ) : (
        children
      )}
      {right}
    </View>
  );
}

export function Label({ children, className }) {
  return <Text className={cn('mb-1.5 text-xs uppercase tracking-wider text-slate-400', className)}>{children}</Text>;
}

export function Helper({ children, className }) {
  return <Text className={cn('text-xs leading-5 text-slate-400', className)}>{children}</Text>;
}

export function PrimaryButton({ children, onPress, disabled, loading, className, icon: Icon }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 active:opacity-80',
        disabled && 'opacity-50',
        className
      )}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : Icon ? (
        <Icon size={18} color="#fff" />
      ) : null}
      <Text className="text-sm font-semibold text-white">{children}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ children, onPress, disabled, className, icon: Icon, danger }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 active:opacity-70',
        danger && 'border-rose-400/30 bg-rose-500/10',
        disabled && 'opacity-50',
        className
      )}
    >
      {Icon ? <Icon size={17} color={danger ? '#fda4af' : '#cbd5e1'} /> : null}
      <Text className={cn('text-sm font-medium', danger ? 'text-rose-200' : 'text-slate-200')}>
        {children}
      </Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, multiline, autoCapitalize, className }) {
  return (
    <View className={cn('mb-3', className)}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={cn(
          'rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white',
          multiline && 'h-24'
        )}
        style={multiline ? { paddingTop: 12 } : undefined}
      />
    </View>
  );
}

export function Chip({ children, active, onPress, className }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'rounded-lg border px-3 py-1.5',
        active ? 'border-emerald-400/50 bg-emerald-500/20' : 'border-white/10 bg-white/5',
        className
      )}
    >
      <Text className={cn('text-xs font-semibold', active ? 'text-emerald-200' : 'text-slate-300')}>
        {children}
      </Text>
    </Pressable>
  );
}

export function StatCard({ icon: Icon, label, value, hint, accent = '#34d399', className }) {
  return (
    <Card className={cn('min-h-[116px] p-4', className)}>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[11px] uppercase tracking-wider text-slate-400">{label}</Text>
        <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: `${accent}22`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={accent} />
        </View>
      </View>
      <Text className="text-xl font-bold text-white">{value}</Text>
      {hint ? <Text className="mt-1 text-[11px] text-slate-500">{hint}</Text> : null}
    </Card>
  );
}

export function ToastView({ toast, onClose }) {
  if (!toast) return null;
  const error = toast.type === 'error';
  const Icon = error ? XCircle : toast.type === 'info' ? Info : CheckCircle2;
  const color = error ? '#fb7185' : toast.type === 'info' ? '#38bdf8' : '#34d399';
  return (
    <View className="absolute bottom-6 left-4 right-4 z-50">
      <BlurView intensity={40} tint="dark" className="overflow-hidden rounded-xl border border-white/10">
        <View className="flex-row items-center gap-3 px-4 py-3">
          <Icon size={18} color={color} />
          <Text className="flex-1 text-sm text-white">{toast.message}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <XCircle size={16} color="#64748b" />
          </Pressable>
        </View>
      </BlurView>
    </View>
  );
}

export function EmptyState({ icon: Icon, title, message }) {
  return (
    <Card className="items-center px-6 py-10">
      {Icon ? <Icon size={30} color="#64748b" /> : null}
      <Text className="mt-3 text-center text-sm font-semibold text-slate-200">{title}</Text>
      {message ? <Text className="mt-1 text-center text-xs text-slate-500">{message}</Text> : null}
    </Card>
  );
}
