const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? 'PXF Hockey (Dev)' : 'PXF Hockey',
    slug: 'pxf-hockey-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: IS_DEV ? 'pxfhockeymobiledev' : 'pxfhockeymobile',
    userInterfaceStyle: 'automatic',
    ios: {
      icon: './assets/images/icon.png',
      bundleIdentifier: IS_DEV ? 'com.pxfhockey.mobile.dev' : 'com.pxfhockey.mobile',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#0D1117',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#0D1117',
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          android: {
            image: './assets/images/splash-icon.png',
            imageWidth: 200,
          },
        },
      ],
      'expo-video',
      'expo-secure-store',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow PXF Hockey to access your photo library to upload team logos, scoresheets, and media.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow PXF Hockey to access your camera to record training film.',
          microphonePermission:
            'Allow PXF Hockey to access your microphone to record training film with audio.',
          recordAudioAndroid: true,
        },
      ],
      [
        'expo-media-library',
        {
          photosPermission: 'Allow PXF Hockey to save recorded clips to your photo library.',
          savePhotosPermission: 'Allow PXF Hockey to save recorded clips to your photo library.',
          isAccessMediaLocationEnabled: true,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '7ac6a049-d6e4-407c-b3f0-50d95324ebca',
      },
    },
  },
};
