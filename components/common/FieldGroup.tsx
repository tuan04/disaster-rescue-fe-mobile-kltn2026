import React from "react";
import { StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";

export interface FieldGroupProps {
    fields?: React.ReactNode[];
    className?: string;
    style?: StyleProp<ViewStyle>;
    label?: string;
    labelStyle?: StyleProp<TextStyle>;
}

function FieldGroup({
    fields = [],
    className = "flex-row flex-wrap gap-2",
    style,
    label,
    labelStyle,
}: FieldGroupProps) {
    return (
        <View className="my-1 gap-1">
            {label && (
                <Text className="text-sm font-bold my-1" style={labelStyle}>
                    {label}
                </Text>
            )}
            <View className={className} style={style}>
                {fields.map((field, index) => (
                    <React.Fragment key={index}>{field}</React.Fragment>
                ))}
            </View>
        </View>
    );
}

export default React.memo(FieldGroup);
