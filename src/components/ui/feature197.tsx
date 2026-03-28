"use client";

import Image from "next/image";
import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/utilities/cn";

export interface FeatureItem {
  id: number;
  title: string;
  image: string;
  description: string;
}

interface Feature197Props {
  title?: string;
  features: FeatureItem[];
  className?: string;
}

import { GutterContainer } from "@/components/layout/GutterContainer";
import { LayoutSection } from "@/components/layout/LayoutSection";

const Feature197 = ({
  title = "Features",
  features,
  className,
}: Feature197Props) => {
  const [activeTabId, setActiveTabId] = useState<number | null>(features[0]?.id || null);
  const [activeImage, setActiveImage] = useState(features[0]?.image || "");

  return (
    <LayoutSection className={className}>
      <GutterContainer>
        <h2 className="mb-20 text-3xl font-extralight md:text-4xl tracking-tight text-center md:text-left">
          {title}
        </h2>
        <div className="flex w-full flex-col md:flex-row items-start justify-between gap-12">
          <div className="w-full md:w-1/2">
            <Accordion
              type="single"
              collapsible
              className="w-full"
              defaultValue={`item-${features[0]?.id}`}
            >
              {features.map((tab) => (
                <AccordionItem
                  key={tab.id}
                  value={`item-${tab.id}`}
                  className="border-b last:border-b-0"
                >
                  <AccordionTrigger
                    onClick={() => {
                      setActiveImage(tab.image);
                      setActiveTabId(tab.id);
                    }}
                    className="cursor-pointer py-4 no-underline hover:no-underline transition text-left"
                  >
                    <h4
                      className={cn(
                        "text-xl md:text-2xl font-semibold transition-colors duration-300",
                        tab.id === activeTabId
                          ? (tab.id === 1 ? "text-[#bb1800]" : tab.id === 2 ? "text-[#14192A]" : "text-[#00a2ff]")
                          : "text-muted-foreground"
                      )}
                    >
                      {tab.title}
                    </h4>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <p className="text-base md:text-lg text-muted-foreground font-varela leading-relaxed">
                      {tab.description}
                    </p>
                    <div className="mt-6 md:hidden overflow-hidden ">
                      <Image
                        src={tab.image}
                        alt={tab.title}
                        width={800}
                        height={600}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="relative hidden w-1/2 overflow-hidden rounded-2xl  md:block aspect-[4/3]">
            {features.map((feature) => (
              <Image
                key={feature.id}
                src={feature.image}
                alt={feature.title}
                fill
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out",
                  activeImage === feature.image ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </div>
        </div>
      </GutterContainer>
    </LayoutSection>
  );
};

export { Feature197 };
