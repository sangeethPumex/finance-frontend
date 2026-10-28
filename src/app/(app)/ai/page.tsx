"use client";

import { Sparkle } from "@phosphor-icons/react";
import { AiChat } from "@/components/organisms/ai-chat";
import { PageLayout } from "@/components/templates";

export default function AiExpert() {
  return (
    <PageLayout title="AI Expert" icon={Sparkle} description="Ask questions about your finances">
      <AiChat />
    </PageLayout>
  );
}
